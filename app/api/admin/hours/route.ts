import { NextRequest, NextResponse } from "next/server";
import { requireStoreOwner, isAdminContext } from "@/lib/admin/auth";

/* ── GET: 営業時間を取得 ── */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId: verifiedStoreId } = result;

  const { data: hours } = await supabase
    .from("store_hours")
    .select("day_of_week, open_time, close_time, is_open")
    .eq("store_id", verifiedStoreId)
    .order("day_of_week");

  return NextResponse.json({
    hours: hours ?? [],
  });
}

/* ── PUT: 営業時間の一括更新 ── */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const storeId = body.store_id;

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId: verifiedStoreId } = result;

  const hours: Array<{
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_open: boolean;
  }> = body.hours;

  if (!Array.isArray(hours) || hours.length !== 7) {
    return NextResponse.json(
      { error: "hours は曜日 0〜6 の 7 件の配列で指定してください" },
      { status: 400 },
    );
  }

  const rows = hours.map((h) => ({
    store_id: verifiedStoreId,
    day_of_week: h.day_of_week,
    open_time: h.open_time,
    close_time: h.close_time,
    is_open: h.is_open,
  }));

  const { error } = await supabase
    .from("store_hours")
    .upsert(rows, { onConflict: "store_id,day_of_week" });

  if (error) {
    return NextResponse.json(
      { error: `営業時間の保存に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "営業時間を保存しました" });
}
