import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendReminder, MailTemplateConfig } from "@/lib/mail";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * GET /api/cron/remind
 *
 * 翌日の予約者へリマインドメールを一斉送信するバッチ処理。
 * Vercel Cron または外部スケジューラから毎日定刻に呼び出す想定。
 *
 * 認証: Authorization ヘッダーに CRON_SECRET を要求する。
 */
export async function GET(req: NextRequest) {
  // ── 認証チェック ──
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET が未設定です");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY が未設定です" },
      { status: 500 }
    );
  }

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // ── 「翌日」の範囲を JST 基準で算出し UTC に変換 ──
  const nowJst = new Date(Date.now() + JST_OFFSET_MS);
  const tomorrowJst = new Date(nowJst);
  tomorrowJst.setUTCDate(tomorrowJst.getUTCDate() + 1);
  tomorrowJst.setUTCHours(0, 0, 0, 0);

  const dayAfterJst = new Date(tomorrowJst);
  dayAfterJst.setUTCDate(dayAfterJst.getUTCDate() + 1);

  // JST 0:00 → UTC に戻す
  const tomorrowStartUtc = new Date(tomorrowJst.getTime() - JST_OFFSET_MS).toISOString();
  const tomorrowEndUtc = new Date(dayAfterJst.getTime() - JST_OFFSET_MS).toISOString();

  // ── 翌日の有効予約を取得 ──
  const { data: bookings, error: bookingErr } = await supabase
    .from("bookings")
    .select(`
      id,
      store_id,
      staff_id,
      user_id,
      start_at,
      end_at,
      total_duration,
      status
    `)
    .eq("status", "reserved")
    .gte("start_at", tomorrowStartUtc)
    .lt("start_at", tomorrowEndUtc);

  if (bookingErr) {
    return NextResponse.json(
      { error: "予約データの取得に失敗しました", detail: bookingErr.message },
      { status: 500 }
    );
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0, message: "翌日の予約はありません" });
  }

  // ── 関連データを一括取得 ──
  const storeIds = [...new Set(bookings.map((b) => b.store_id))];
  const staffIds = [...new Set(bookings.map((b) => b.staff_id))];
  const userIds = [...new Set(bookings.map((b) => b.user_id))];
  const bookingIds = bookings.map((b) => b.id);

  const [storesRes, staffsRes, profilesRes, bookingMenusRes, mailConfigRes] = await Promise.all([
    supabase.from("stores").select("id, name, phone").in("id", storeIds),
    supabase.from("staffs").select("id, name").in("id", staffIds),
    supabase.from("profiles").select("id, email, full_name").in("id", userIds),
    supabase.from("booking_menus").select("booking_id, menu_id").in("booking_id", bookingIds),
    supabase.from("site_settings").select("store_id, mail_config").in("store_id", storeIds),
  ]);

  // メニュー名も取得
  const allMenuIds = [...new Set((bookingMenusRes.data ?? []).map((bm) => bm.menu_id))];
  const { data: menus } = allMenuIds.length > 0
    ? await supabase.from("menus").select("id, name").in("id", allMenuIds)
    : { data: [] };

  // ルックアップ Map を構築
  const storeMap = new Map((storesRes.data ?? []).map((s) => [s.id, s]));
  const staffMap = new Map((staffsRes.data ?? []).map((s) => [s.id, s]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const menuMap = new Map((menus ?? []).map((m) => [m.id, m.name]));
  const mailConfigMap = new Map(
    (mailConfigRes.data ?? []).map((s) => [s.store_id, (s.mail_config as MailTemplateConfig) ?? undefined]),
  );

  // booking_id → メニュー名配列
  const bookingMenuMap = new Map<string, string[]>();
  for (const bm of bookingMenusRes.data ?? []) {
    const names = bookingMenuMap.get(bm.booking_id) ?? [];
    names.push(menuMap.get(bm.menu_id) ?? "不明");
    bookingMenuMap.set(bm.booking_id, names);
  }

  // ── リマインドメール送信 ──
  let sentCount = 0;
  const errors: string[] = [];

  const sendPromises = bookings.map(async (booking) => {
    const profile = profileMap.get(booking.user_id);
    const store = storeMap.get(booking.store_id);
    const staff = staffMap.get(booking.staff_id);

    if (!profile?.email || !store || !staff) return;

    // UTC → JST 表示用に変換
    const startJst = new Date(new Date(booking.start_at).getTime() + JST_OFFSET_MS);
    const dateStr = `${startJst.getUTCFullYear()}-${String(startJst.getUTCMonth() + 1).padStart(2, "0")}-${String(startJst.getUTCDate()).padStart(2, "0")}`;
    const timeStr = `${String(startJst.getUTCHours()).padStart(2, "0")}:${String(startJst.getUTCMinutes()).padStart(2, "0")}`;

    try {
      await sendReminder(profile.email, {
        storeName: store.name,
        storePhone: store.phone,
        customerName: profile.full_name ?? "お客様",
        staffName: staff.name,
        date: dateStr,
        time: timeStr,
        duration: booking.total_duration,
        menuNames: bookingMenuMap.get(booking.id) ?? [],
      }, mailConfigMap.get(booking.store_id));
      sentCount++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`booking ${booking.id}: ${msg}`);
    }
  });

  await Promise.all(sendPromises);

  return NextResponse.json({
    sent: sentCount,
    total: bookings.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
