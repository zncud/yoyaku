import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendBookingConfirmation, sendAdminNewBookingNotify, MailTemplateConfig } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

/* ── Request Body ── */
interface BookingRequest {
  store_id: string;
  staff_id: string;
  menu_ids: string[];
  date: string;       // "YYYY-MM-DD" (JST)
  slot: string;       // "HH:mm"
  // total_duration はクライアント値を信用せずサーバーで計算する
  guest?: {
    name: string;
    email: string;
    phone: string;
    password: string;
  };
}

/* JST の日付+時刻文字列 → UTC の ISO 文字列 */
function jstToUtc(date: string, time: string): string {
  const jstIso = `${date}T${time}:00+09:00`;
  return new Date(jstIso).toISOString();
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  // ── レート制限（IP ベース: 10 件/分） ──
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`booking:${ip}`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくしてからお試しください。" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const body: BookingRequest = await req.json();

  // ── バリデーション ──
  if (!body.store_id || !body.staff_id || !body.menu_ids?.length || !body.date || !body.slot) {
    return errorResponse("必須パラメータが不足しています", 400);
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return errorResponse("サーバー設定エラー", 500);
  }

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const supabase = await createClient();

  // ── A. ユーザー特定 ──
  let userId: string | null = null;
  let isNewUser = false;

  if (body.guest) {
    const { guest } = body;
    if (!guest.email || !guest.password || !guest.name) {
      return errorResponse("ゲスト情報が不足しています", 400);
    }

    const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
      email: guest.email,
      password: guest.password,
      email_confirm: true,
      user_metadata: {
        full_name: guest.name,
        phone: guest.phone || "",
        store_id: body.store_id,
      },
    });

    if (createErr) {
      if (createErr.message.includes("already been registered") || createErr.message.includes("already exists")) {
        return errorResponse("このメールアドレスは既に登録されています。ログインしてから予約してください。", 409);
      }
      return errorResponse("アカウント作成に失敗しました", 400);
    }

    userId = newUser.user.id;
    isNewUser = true;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return errorResponse("ログインが必要です。ゲスト情報を入力するか、ログインしてください。", 401);
    }
    userId = user.id;

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("store_id")
      .eq("id", userId)
      .single();

    if (profile?.store_id) {
      if (profile.store_id !== body.store_id) {
        return errorResponse("このアカウントは別の店舗で登録されています。", 403);
      }
    } else {
      await adminSupabase
        .from("profiles")
        .update({ store_id: body.store_id })
        .eq("id", userId);
    }
  }

  // ── B. メニュー検証 & サーバーサイドで total_duration を計算 ──
  // クライアント送信の total_duration は信用せず、DBから正確な値を取得する
  const { data: menuData, error: menuFetchErr } = await adminSupabase
    .from("menus")
    .select("id, duration_minutes, store_id, is_active")
    .in("id", body.menu_ids);

  if (menuFetchErr || !menuData) {
    return errorResponse("メニュー情報の取得に失敗しました", 500);
  }

  // メニューが指定店舗に属しており、有効であることを確認
  const validMenus = menuData.filter(
    (m) => m.store_id === body.store_id && m.is_active
  );
  if (validMenus.length !== body.menu_ids.length) {
    return errorResponse("無効なメニューが含まれています", 400);
  }

  const totalDuration = validMenus.reduce((sum, m) => sum + m.duration_minutes, 0);

  // ── C. 時間計算 ──
  const startAtUtc = jstToUtc(body.date, body.slot);
  const startDate = new Date(startAtUtc);
  const endDate = new Date(startDate.getTime() + totalDuration * 60 * 1000);
  const endAtUtc = endDate.toISOString();

  // ── D. ダブルブッキング防止 ──
  const { data: overlapping } = await adminSupabase
    .from("bookings")
    .select("id")
    .eq("staff_id", body.staff_id)
    .in("status", ["pending", "reserved"])
    .lt("start_at", endAtUtc)
    .gt("end_at", startAtUtc)
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return errorResponse("申し訳ございません。この時間帯は既に予約が入っています。別の時間をお選びください。", 409);
  }

  // ── E. 予約データ挿入 ──
  const { data: booking, error: bookingErr } = await adminSupabase
    .from("bookings")
    .insert({
      store_id: body.store_id,
      staff_id: body.staff_id,
      user_id: userId,
      start_at: startAtUtc,
      end_at: endAtUtc,
      total_duration: totalDuration,
      status: "pending", // 管理者が承認するまで pending
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    // 23P01 = exclusion_violation（同一スタッフ・同時間帯への同時予約）
    if (bookingErr?.code === "23P01") {
      return errorResponse(
        "申し訳ございません。この時間帯は既に予約が入っています。別の時間をお選びください。",
        409
      );
    }
    return errorResponse("予約の保存に失敗しました", 500);
  }

  // booking_menus テーブル
  const bookingMenus = body.menu_ids.map((menuId) => ({
    booking_id: booking.id,
    menu_id: menuId,
  }));

  const { error: menuErr } = await adminSupabase
    .from("booking_menus")
    .insert(bookingMenus);

  if (menuErr) {
    await adminSupabase.from("bookings").delete().eq("id", booking.id);
    return errorResponse("メニュー情報の保存に失敗しました", 500);
  }

  // ── F. メール送信（非同期） ──
  const emailPromises: Promise<void>[] = [];

  try {
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", userId)
      .single();

    const [{ data: store }, { data: staff }, { data: menuItems }, { data: siteSettings }] =
      await Promise.all([
        adminSupabase.from("stores").select("name, phone, owner_id").eq("id", body.store_id).single(),
        adminSupabase.from("staffs").select("name").eq("id", body.staff_id).single(),
        adminSupabase.from("menus").select("name").in("id", body.menu_ids),
        adminSupabase.from("site_settings").select("mail_config").eq("store_id", body.store_id).single(),
      ]);

    const mailConfig = (siteSettings?.mail_config as MailTemplateConfig) ?? undefined;

    if (profile?.email && store && staff) {
      const customerName = profile.full_name ?? "お客様";
      const menuNames = menuItems?.map((m) => m.name) ?? [];

      emailPromises.push(
        sendBookingConfirmation(profile.email, {
          storeName: store.name,
          storePhone: store.phone,
          customerName,
          staffName: staff.name,
          date: body.date,
          time: body.slot,
          duration: totalDuration,
          menuNames,
          isNewUser,
        }, mailConfig)
      );

      const { data: ownerProfile } = await adminSupabase
        .from("profiles")
        .select("email")
        .eq("id", store.owner_id)
        .single();

      if (ownerProfile?.email) {
        emailPromises.push(
          sendAdminNewBookingNotify(ownerProfile.email, {
            storeName: store.name,
            customerName,
            customerEmail: profile.email,
            customerPhone: profile.phone ?? "",
            staffName: staff.name,
            date: body.date,
            time: body.slot,
            duration: totalDuration,
            menuNames,
          }, mailConfig)
        );
      }
    }
  } catch (e) {
    console.warn("メール送信データの取得に失敗:", e);
  }

  if (emailPromises.length > 0) {
    Promise.all(emailPromises).catch((e) =>
      console.warn("メール送信に失敗:", e)
    );
  }

  // ── G. レスポンス ──
  return NextResponse.json({
    booking_id: booking.id,
    status: "reserved",
    is_new_user: isNewUser,
  });
}
