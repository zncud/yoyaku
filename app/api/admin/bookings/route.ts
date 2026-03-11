import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireStoreOwner, isAdminContext } from "@/lib/admin/auth";
import { sendCancellationNotice, sendBookingConfirmation, sendAdminNewBookingNotify, MailTemplateConfig } from "@/lib/mail";


/**
 * PATCH /api/admin/bookings
 * 管理者による予約キャンセル
 *
 * Body: { store_id, booking_id }
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { store_id, booking_id } = body;

  if (!booking_id) {
    return NextResponse.json({ error: "booking_id は必須です" }, { status: 400 });
  }

  const result = await requireStoreOwner(store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  // service_role で操作（予約の UPDATE と関連データ取得に必要）
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 予約が該当店舗のものか確認
  const { data: booking, error: fetchErr } = await adminDb
    .from("bookings")
    .select("id, store_id, user_id, staff_id, start_at, end_at, total_duration, status")
    .eq("id", booking_id)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
  }

  if (booking.store_id !== storeId) {
    return NextResponse.json({ error: "この予約を操作する権限がありません" }, { status: 403 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "この予約は既にキャンセル済みです" }, { status: 400 });
  }

  // ステータスを cancelled に更新
  const { error: updateErr } = await adminDb
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking_id);

  if (updateErr) {
    return NextResponse.json(
      { error: `キャンセルに失敗しました: ${updateErr.message}` },
      { status: 500 },
    );
  }

  // 顧客へキャンセル通知メール送信（非同期、エラーは握りつぶす）
  try {
    const [{ data: profile }, { data: store }, { data: staff }, { data: bookingMenus }, { data: siteSettings }] =
      await Promise.all([
        adminDb.from("profiles").select("email, full_name").eq("id", booking.user_id).single(),
        supabase.from("stores").select("name, phone").eq("id", storeId).single(),
        adminDb.from("staffs").select("name").eq("id", booking.staff_id).single(),
        adminDb.from("booking_menus").select("menus(name)").eq("booking_id", booking_id),
        adminDb.from("site_settings").select("mail_config").eq("store_id", storeId).single(),
      ]);

    const mailConfig = (siteSettings?.mail_config as MailTemplateConfig) ?? undefined;

    if (profile?.email && store) {
      const jst = new Date(new Date(booking.start_at).getTime() + 9 * 60 * 60 * 1000);
      const date = `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, "0")}/${String(jst.getUTCDate()).padStart(2, "0")}`;
      const time = `${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`;
      const menuNames = (bookingMenus ?? [])
        .map((bm) => (bm.menus as unknown as { name: string })?.name)
        .filter(Boolean);

      await sendCancellationNotice(profile.email, {
        storeName: store.name,
        storePhone: store.phone,
        customerName: profile.full_name || "お客様",
        staffName: staff?.name || "未定",
        date,
        time,
        menuNames,
      }, mailConfig);
    }
  } catch (e) {
    console.error("キャンセルメール送信失敗:", e);
  }

  return NextResponse.json({ success: true });
}

/* ── JST の日付+時刻文字列 → UTC の ISO 文字列 ── */
function jstToUtc(date: string, time: string): string {
  const jstIso = `${date}T${time}:00+09:00`;
  return new Date(jstIso).toISOString();
}

/**
 * POST /api/admin/bookings
 * 管理者による予約作成
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    store_id,
    staff_id,
    menu_ids,
    date,
    slot,
    total_duration,
    user_id,
    guest,
  } = body as {
    store_id: string;
    staff_id: string;
    menu_ids: string[];
    date: string;
    slot: string;
    total_duration: number;
    user_id?: string;
    guest?: { name: string; email: string; phone: string };
  };

  // バリデーション
  if (!store_id || !staff_id || !menu_ids?.length || !date || !slot || !total_duration) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }
  if (!user_id && !guest) {
    return NextResponse.json({ error: "顧客情報が必要です（user_id または guest）" }, { status: 400 });
  }

  const result = await requireStoreOwner(store_id);
  if (!isAdminContext(result)) return result;

  const { storeId } = result;

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // ユーザー情報の確認
  let bookingUserId: string | null = null;
  let customerName = "";
  let customerEmail = "";
  let customerPhone = "";

  if (user_id) {
    const { data: profile } = await adminDb
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", user_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "指定されたユーザーが見つかりません" }, { status: 404 });
    }
    bookingUserId = user_id;
    customerName = profile.full_name || "お客様";
    customerEmail = profile.email || "";
    customerPhone = profile.phone || "";
  } else if (guest) {
    if (!guest.name || !guest.email) {
      return NextResponse.json({ error: "ゲストの名前とメールアドレスは必須です" }, { status: 400 });
    }
    bookingUserId = null;
    customerName = guest.name;
    customerEmail = guest.email;
    customerPhone = guest.phone || "";
  }

  // 時間計算
  const startAtUtc = jstToUtc(date, slot);
  const startDate = new Date(startAtUtc);
  const endDate = new Date(startDate.getTime() + total_duration * 60 * 1000);
  const endAtUtc = endDate.toISOString();

  // ダブルブッキング防止
  const { data: overlapping } = await adminDb
    .from("bookings")
    .select("id")
    .eq("staff_id", staff_id)
    .eq("status", "reserved")
    .lt("start_at", endAtUtc)
    .gt("end_at", startAtUtc)
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json(
      { error: "この時間帯は既に予約が入っています。別の時間をお選びください。" },
      { status: 409 },
    );
  }

  // 予約データ挿入
  const bookingRow: Record<string, unknown> = {
    store_id: storeId,
    staff_id,
    user_id: bookingUserId,   // guest の場合は null
    start_at: startAtUtc,
    end_at: endAtUtc,
    total_duration,
    status: "reserved",
    guest_name: guest?.name ?? null,
    guest_email: guest?.email ?? null,
    guest_phone: guest?.phone || null,
  };

  const { data: booking, error: bookingErr } = await adminDb
    .from("bookings")
    .insert(bookingRow)
    .select("id")
    .single();

  if (bookingErr || !booking) {
    return NextResponse.json(
      { error: `予約の保存に失敗しました: ${bookingErr?.message}` },
      { status: 500 },
    );
  }

  // booking_menus 挿入
  const bookingMenus = menu_ids.map((menuId: string) => ({
    booking_id: booking.id,
    menu_id: menuId,
  }));

  const { error: menuErr } = await adminDb
    .from("booking_menus")
    .insert(bookingMenus);

  if (menuErr) {
    await adminDb.from("bookings").delete().eq("id", booking.id);
    return NextResponse.json(
      { error: `メニュー情報の保存に失敗しました: ${menuErr.message}` },
      { status: 500 },
    );
  }

  // メール送信
  const emailPromises: Promise<void>[] = [];

  try {
    const [{ data: store }, { data: staff }, { data: menuItems }, { data: mailSettings }] =
      await Promise.all([
        adminDb.from("stores").select("name, phone, owner_id").eq("id", storeId).single(),
        adminDb.from("staffs").select("name").eq("id", staff_id).single(),
        adminDb.from("menus").select("name").in("id", menu_ids),
        adminDb.from("site_settings").select("mail_config").eq("store_id", storeId).single(),
      ]);

    const mailConfig = (mailSettings?.mail_config as MailTemplateConfig) ?? undefined;

    if (customerEmail && store && staff) {
      const menuNames = menuItems?.map((m: { name: string }) => m.name) ?? [];

      // 顧客へ予約確定メール
      emailPromises.push(
        sendBookingConfirmation(customerEmail, {
          storeName: store.name,
          storePhone: store.phone,
          customerName,
          staffName: staff.name,
          date,
          time: slot,
          duration: total_duration,
          menuNames,
        }, mailConfig)
      );

      // user_id 指定時のみ管理者通知（ゲストは管理者自身が作成しているため不要）
      if (user_id) {
        const { data: ownerProfile } = await adminDb
          .from("profiles")
          .select("email")
          .eq("id", store.owner_id)
          .single();

        if (ownerProfile?.email) {
          emailPromises.push(
            sendAdminNewBookingNotify(ownerProfile.email, {
              storeName: store.name,
              customerName,
              customerEmail,
              customerPhone,
              staffName: staff.name,
              date,
              time: slot,
              duration: total_duration,
              menuNames,
            }, mailConfig)
          );
        }
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

  return NextResponse.json({
    booking_id: booking.id,
    status: "reserved",
  });
}
