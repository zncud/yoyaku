import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireStoreOwner, isAdminContext } from "@/lib/admin/auth";
import { sendBookingConfirmation, MailTemplateConfig } from "@/lib/mail";

/**
 * POST /api/admin/bookings/approve
 * 管理者による予約承認（pending → reserved）
 *
 * Body: { store_id, booking_id }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { store_id, booking_id } = body;

  if (!booking_id) {
    return NextResponse.json({ error: "booking_id は必須です" }, { status: 400 });
  }

  const result = await requireStoreOwner(store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 予約が該当店舗のものか確認
  const { data: booking, error: fetchErr } = await adminDb
    .from("bookings")
    .select("id, store_id, user_id, staff_id, start_at, end_at, total_duration, status, guest_name, guest_email")
    .eq("id", booking_id)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
  }

  if (booking.store_id !== storeId) {
    return NextResponse.json({ error: "この予約を操作する権限がありません" }, { status: 403 });
  }

  if (booking.status !== "pending") {
    return NextResponse.json(
      { error: `この予約は承認できません（現在のステータス: ${booking.status}）` },
      { status: 400 }
    );
  }

  // ステータスを reserved に更新
  const { error: updateErr } = await adminDb
    .from("bookings")
    .update({ status: "reserved" })
    .eq("id", booking_id);

  if (updateErr) {
    return NextResponse.json(
      { error: `承認に失敗しました: ${updateErr.message}` },
      { status: 500 }
    );
  }

  // 顧客へ確定メール送信（非同期）
  try {
    const [{ data: store }, { data: staff }, { data: bookingMenus }, { data: siteSettings }] =
      await Promise.all([
        supabase.from("stores").select("name, phone").eq("id", storeId).single(),
        adminDb.from("staffs").select("name").eq("id", booking.staff_id).single(),
        adminDb.from("booking_menus").select("menus(name)").eq("booking_id", booking_id),
        adminDb.from("site_settings").select("mail_config").eq("store_id", storeId).single(),
      ]);

    const mailConfig = (siteSettings?.mail_config as MailTemplateConfig) ?? undefined;

    // メールアドレスとユーザー名を取得
    let customerEmail = booking.guest_email ?? null;
    let customerName = booking.guest_name ?? "お客様";

    if (booking.user_id) {
      const { data: profile } = await adminDb
        .from("profiles")
        .select("email, full_name")
        .eq("id", booking.user_id)
        .single();
      customerEmail = profile?.email ?? null;
      customerName = profile?.full_name ?? "お客様";
    }

    if (customerEmail && store && staff) {
      const jst = new Date(new Date(booking.start_at).getTime() + 9 * 60 * 60 * 1000);
      const date = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
      const time = `${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`;
      const menuNames = (bookingMenus ?? [])
        .map((bm) => (bm.menus as unknown as { name: string })?.name)
        .filter(Boolean);

      sendBookingConfirmation(customerEmail, {
        storeName: store.name,
        storePhone: store.phone,
        customerName,
        staffName: staff.name,
        date,
        time,
        duration: booking.total_duration,
        menuNames,
      }, mailConfig).catch((e) => console.warn("確定メール送信失敗:", e));
    }
  } catch (e) {
    console.warn("承認後メール送信データの取得に失敗:", e);
  }

  return NextResponse.json({ success: true });
}
