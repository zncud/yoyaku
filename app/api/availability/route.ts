import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// ─── タイムゾーン定数 ───
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// ─── 型定義 ───
interface TimeRange {
  start: Date;
  end: Date;
}

// ─── ユーティリティ関数 ───

/**
 * JST 日付文字列 (YYYY-MM-DD) を、その日の UTC 検索範囲に変換する。
 *
 * 例: "2024-01-15" (JST)
 *   → start: 2024-01-14T15:00:00.000Z  (JST 00:00 の UTC 表現)
 *   → end:   2024-01-15T15:00:00.000Z  (翌 JST 00:00 の UTC 表現)
 */
function jstDateToUtcRange(dateStr: string): { start: string; end: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startUtc = new Date(Date.UTC(year, month - 1, day) - JST_OFFSET_MS);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { start: startUtc.toISOString(), end: endUtc.toISOString() };
}

/** UTC の Date を JST の "HH:MM" 文字列に変換する */
function utcToJstTimeString(utcDate: Date): string {
  const jst = new Date(utcDate.getTime() + JST_OFFSET_MS);
  const hours = String(jst.getUTCHours()).padStart(2, "0");
  const minutes = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** 2 つの時間範囲が重なるか判定する（半開区間 [start, end)）*/
function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

// ─── メインハンドラ ───

export async function GET(request: NextRequest) {
  // ── レート制限（IP ベース: 60 件/分） ──
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`availability:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくしてからお試しください。" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staff_id"); // nullable（指名なし）
  const storeId = searchParams.get("store_id");
  const date = searchParams.get("date"); // YYYY-MM-DD (JST)
  const durationStr = searchParams.get("duration"); // 分

  // ── バリデーション ──
  if (!storeId || !date || !durationStr) {
    return NextResponse.json(
      { error: "store_id, date, duration は必須パラメータです" },
      { status: 400 },
    );
  }

  const duration = parseInt(durationStr, 10);
  if (isNaN(duration) || duration <= 0) {
    return NextResponse.json(
      { error: "duration は正の整数で指定してください" },
      { status: 400 },
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date は YYYY-MM-DD 形式で指定してください" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // ── JST → UTC 変換 ──
  const utcRange = jstDateToUtcRange(date);

  // ── site_settings から予約枠の間隔を取得 ──
  const { data: settings } = await supabase
    .from("site_settings")
    .select("booking_interval_minutes")
    .eq("store_id", storeId)
    .single();

  const interval = settings?.booking_interval_minutes ?? 30;

  // min_advance_days を別クエリで取得（カラム未作成でもエラーにならない）
  let minAdvanceDays = 0;
  try {
    const { data: advData } = await supabase
      .from("site_settings")
      .select("min_advance_days")
      .eq("store_id", storeId)
      .single();
    if (advData?.min_advance_days != null) {
      minAdvanceDays = advData.min_advance_days;
    }
  } catch {
    // カラム未作成時は無視
  }

  // 予約受付日数チェック: 今日のJST日付と指定日を比較
  if (minAdvanceDays > 0) {
    const nowUtc = Date.now();
    const nowJst = new Date(nowUtc + JST_OFFSET_MS);
    const todayJstStr = `${nowJst.getUTCFullYear()}-${String(nowJst.getUTCMonth() + 1).padStart(2, "0")}-${String(nowJst.getUTCDate()).padStart(2, "0")}`;
    const todayDate = new Date(todayJstStr);
    const requestedDate = new Date(date);
    const diffDays = Math.floor((requestedDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < minAdvanceDays) {
      return NextResponse.json({ slots: [] });
    }
  }

  // ── 営業時間チェック ──
  const [year, month, day] = date.split("-").map(Number);
  const requestDate = new Date(year, month - 1, day);
  const dayOfWeek = requestDate.getDay();

  const { data: storeHours } = await supabase
    .from("store_hours")
    .select("open_time, close_time, is_open")
    .eq("store_id", storeId)
    .eq("day_of_week", dayOfWeek)
    .single();

  // 営業時間が未設定 or is_open=false → 空スロット
  if (!storeHours || !storeHours.is_open) {
    return NextResponse.json({ slots: [] });
  }

  // 営業時間の UTC レンジ
  const openParts = storeHours.open_time.split(":").map(Number);
  const closeParts = storeHours.close_time.split(":").map(Number);
  // JST → UTC
  const businessStart = new Date(Date.UTC(year, month - 1, day, openParts[0], openParts[1] || 0) - JST_OFFSET_MS);
  const businessEnd = new Date(Date.UTC(year, month - 1, day, closeParts[0], closeParts[1] || 0) - JST_OFFSET_MS);

  // ── 対象スタッフの決定 ──
  let targetStaffIds: string[];

  if (staffId) {
    targetStaffIds = [staffId];
  } else {
    const { data: allStaff } = await supabase
      .from("staffs")
      .select("id")
      .eq("store_id", storeId)
      .eq("is_active", true);
    targetStaffIds = allStaff?.map((s) => s.id) ?? [];
  }

  if (targetStaffIds.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // ── DB からブロック・予約データを並列取得 ──
  const [blockRes, bookingRes] = await Promise.all([
    // 休憩 (break) / 公休 (holiday) ブロック
    supabase
      .from("shifts")
      .select("staff_id, start_at, end_at")
      .in("staff_id", targetStaffIds)
      .in("type", ["break", "holiday"])
      .lt("start_at", utcRange.end)
      .gt("end_at", utcRange.start),

    // 既存予約 (status = reserved)
    supabase
      .from("bookings")
      .select("staff_id, start_at, end_at")
      .in("staff_id", targetStaffIds)
      .eq("status", "reserved")
      .lt("start_at", utcRange.end)
      .gt("end_at", utcRange.start),
  ]);

  // ── ヘルパー: DB レコード → TimeRange 変換 ──
  const toTimeRange = (r: { start_at: string; end_at: string }): TimeRange => ({
    start: new Date(r.start_at),
    end: new Date(r.end_at),
  });

  const intervalMs = interval * 60 * 1000;
  const durationMs = duration * 60 * 1000;
  const availableSlots = new Set<string>();

  // ── スタッフごとに空き枠を算出 ──
  for (const sid of targetStaffIds) {
    const blocks = (blockRes.data ?? [])
      .filter((s) => s.staff_id === sid)
      .map(toTimeRange);

    const bookings = (bookingRes.data ?? [])
      .filter((b) => b.staff_id === sid)
      .map(toTimeRange);

    let slotStart = new Date(businessStart.getTime());

    while (slotStart.getTime() + durationMs <= businessEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + durationMs);
      const slot: TimeRange = { start: slotStart, end: slotEnd };

      const isBlocked = blocks.some((b) => overlaps(slot, b));
      const isBooked = bookings.some((b) => overlaps(slot, b));

      if (!isBlocked && !isBooked) {
        availableSlots.add(utcToJstTimeString(slotStart));
      }

      slotStart = new Date(slotStart.getTime() + intervalMs);
    }
  }

  // ── レスポンス: JST 時刻文字列の昇順配列 ──
  const sortedSlots = Array.from(availableSlots).sort();

  return NextResponse.json({ slots: sortedSlots });
}
