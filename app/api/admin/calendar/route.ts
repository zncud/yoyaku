import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireStoreOwner, isAdminContext } from "@/lib/admin/auth";

/**
 * GET /api/admin/calendar?store_id=xxx&start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * 指定期間の予約 + シフトを返す（週表示カレンダー用）
 * 日付は JST ベースで受け取り、内部で UTC に変換して検索する
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function jstDateToUtcRange(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - JST_OFFSET_MS).toISOString();
}

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  const startDate = req.nextUrl.searchParams.get("start"); // YYYY-MM-DD (JST)
  const endDate = req.nextUrl.searchParams.get("end"); // YYYY-MM-DD (JST)

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "start, end は必須パラメータです（YYYY-MM-DD）" },
      { status: 400 }
    );
  }

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId: verifiedStoreId } = result;

  // JST の日付範囲 → UTC に変換
  const utcStart = jstDateToUtcRange(startDate);
  // end は翌日の 00:00 JST まで含めるため +1 日
  const [ey, em, ed] = endDate.split("-").map(Number);
  const nextDay = new Date(Date.UTC(ey, em - 1, ed + 1) - JST_OFFSET_MS);
  const utcEnd = nextDay.toISOString();

  // スタッフID一覧を先に取得（シフト検索用）
  const { data: staffRows } = await supabase
    .from("staffs")
    .select("id")
    .eq("store_id", verifiedStoreId);
  const staffIds = (staffRows ?? []).map((s) => s.id);

  // 予約 + シフトを並列取得
  const [bookingsRes, shiftsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `
        id, staff_id, user_id, start_at, end_at, total_duration, status, created_at,
        guest_name, guest_email, guest_phone,
        staffs ( name ),
        booking_menus ( menus ( name ) )
        `
      )
      .eq("store_id", verifiedStoreId)
      .lt("start_at", utcEnd)
      .gte("start_at", utcStart)
      .order("start_at", { ascending: true }),

    staffIds.length > 0
      ? supabase
          .from("shifts")
          .select("id, staff_id, start_at, end_at, type")
          .in("staff_id", staffIds)
          .lt("start_at", utcEnd)
          .gte("start_at", utcStart)
          .order("start_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (bookingsRes.error) {
    return NextResponse.json(
      { error: `予約データの取得に失敗しました: ${bookingsRes.error.message}` },
      { status: 500 }
    );
  }

  // 顧客プロフィールを service_role で取得（RLS バイパス）
  const bookings = bookingsRes.data ?? [];
  const userIds = [...new Set(bookings.map((b: { user_id: string | null }) => b.user_id).filter(Boolean))] as string[];
  let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};

  if (userIds.length > 0) {
    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: profiles } = await adminDb
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    for (const p of profiles ?? []) {
      profileMap[p.id] = { full_name: p.full_name, email: p.email };
    }
  }

  // profiles 情報をマージ
  const enrichedBookings = bookings.map((b: { id: string; user_id: string | null; [key: string]: unknown }) => ({
    ...b,
    profiles: b.user_id ? (profileMap[b.user_id] ?? null) : null,
  }));

  return NextResponse.json({
    bookings: enrichedBookings,
    shifts: shiftsRes.data ?? [],
  });
}
