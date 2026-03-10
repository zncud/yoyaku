import { NextRequest, NextResponse } from "next/server";
import { requireStoreOwner, isAdminContext } from "@/lib/admin/auth";

/* ── リクエスト型定義 ── */
interface ShiftCreateBody {
  store_id: string;
  staff_id: string;
  start_at: string; // ISO 8601 UTC
  end_at: string;
  type: "work" | "break" | "holiday";
}

interface ShiftUpdateBody {
  id: string;
  store_id: string;
  start_at?: string;
  end_at?: string;
  type?: "work" | "break" | "holiday";
}

interface ShiftDeleteBody {
  id: string;
  store_id: string;
}

/* ── GET: シフト一覧 ── */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  const staffId = req.nextUrl.searchParams.get("staff_id");
  const startDate = req.nextUrl.searchParams.get("start"); // optional ISO
  const endDate = req.nextUrl.searchParams.get("end"); // optional ISO

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId: verifiedStoreId } = result;

  // store のスタッフID一覧を取得
  const staffFilter = staffId
    ? [staffId]
    : (
        await supabase.from("staffs").select("id").eq("store_id", verifiedStoreId)
      ).data?.map((s) => s.id) ?? [];

  let query = supabase
    .from("shifts")
    .select("id, staff_id, start_at, end_at, type")
    .in("staff_id", staffFilter)
    .order("start_at", { ascending: true });

  if (startDate) query = query.gte("start_at", startDate);
  if (endDate) query = query.lte("start_at", endDate);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: `シフトの取得に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ shifts: data });
}

/* ── POST: シフト/ブロック枠の追加 ── */
export async function POST(req: NextRequest) {
  const body: ShiftCreateBody = await req.json();

  // バリデーション
  if (!body.staff_id || !body.start_at || !body.end_at || !body.type) {
    return NextResponse.json(
      { error: "staff_id, start_at, end_at, type は必須です" },
      { status: 400 }
    );
  }

  if (!["work", "break", "holiday"].includes(body.type)) {
    return NextResponse.json(
      { error: "type は work, break, holiday のいずれかです" },
      { status: 400 }
    );
  }

  const startAt = new Date(body.start_at);
  const endAt = new Date(body.end_at);
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) {
    return NextResponse.json(
      { error: "start_at は end_at より前の有効な日時を指定してください" },
      { status: 400 }
    );
  }

  const result = await requireStoreOwner(body.store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  // スタッフがこのストアに属しているか確認
  const { data: staff, error: staffErr } = await supabase
    .from("staffs")
    .select("id")
    .eq("id", body.staff_id)
    .eq("store_id", storeId)
    .single();

  if (staffErr || !staff) {
    return NextResponse.json(
      { error: "指定されたスタッフがこのストアに存在しません" },
      { status: 404 }
    );
  }

  // ── ブロック枠バリデーション ──
  // break / holiday を設定する際、その時間帯に予約が入っていればエラー
  if (body.type === "break" || body.type === "holiday") {
    const { data: overlapping } = await supabase
      .from("bookings")
      .select("id, start_at, end_at")
      .eq("staff_id", body.staff_id)
      .eq("status", "reserved")
      .lt("start_at", body.end_at)
      .gt("end_at", body.start_at)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        {
          error:
            "この時間帯には既に予約が入っています。ブロック枠を設定するには、先に予約をキャンセルしてください。",
          conflicting_booking_id: overlapping[0].id,
        },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      staff_id: body.staff_id,
      start_at: body.start_at,
      end_at: body.end_at,
      type: body.type,
    })
    .select("id, staff_id, start_at, end_at, type")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `シフトの追加に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ shift: data }, { status: 201 });
}

/* ── PUT: シフト更新 ── */
export async function PUT(req: NextRequest) {
  const body: ShiftUpdateBody = await req.json();

  if (!body.id) {
    return NextResponse.json(
      { error: "シフトIDは必須です" },
      { status: 400 }
    );
  }

  const result = await requireStoreOwner(body.store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  // 更新対象のシフトを取得
  const { data: existing } = await supabase
    .from("shifts")
    .select("id, staff_id, start_at, end_at, type")
    .eq("id", body.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "指定されたシフトが見つかりません" },
      { status: 404 }
    );
  }

  // スタッフがこのストアに属するか確認
  const { data: staff } = await supabase
    .from("staffs")
    .select("id")
    .eq("id", existing.staff_id)
    .eq("store_id", storeId)
    .single();

  if (!staff) {
    return NextResponse.json(
      { error: "この操作を行う権限がありません" },
      { status: 403 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (body.start_at !== undefined) updates.start_at = body.start_at;
  if (body.end_at !== undefined) updates.end_at = body.end_at;
  if (body.type !== undefined) updates.type = body.type;

  const newStartAt = (updates.start_at as string) ?? existing.start_at;
  const newEndAt = (updates.end_at as string) ?? existing.end_at;
  const newType = (updates.type as string) ?? existing.type;

  // ブロック枠の予約重複チェック
  if (newType === "break" || newType === "holiday") {
    const { data: overlapping } = await supabase
      .from("bookings")
      .select("id")
      .eq("staff_id", existing.staff_id)
      .eq("status", "reserved")
      .lt("start_at", newEndAt)
      .gt("end_at", newStartAt)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        {
          error:
            "この時間帯には既に予約が入っています。ブロック枠を設定するには、先に予約をキャンセルしてください。",
        },
        { status: 409 }
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "更新するフィールドが指定されていません" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("shifts")
    .update(updates)
    .eq("id", body.id)
    .select("id, staff_id, start_at, end_at, type")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `シフトの更新に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ shift: data });
}

/* ── DELETE: シフト削除 ── */
export async function DELETE(req: NextRequest) {
  const body: ShiftDeleteBody = await req.json();

  if (!body.id) {
    return NextResponse.json(
      { error: "シフトIDは必須です" },
      { status: 400 }
    );
  }

  const result = await requireStoreOwner(body.store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  // シフトの所有確認
  const { data: existing } = await supabase
    .from("shifts")
    .select("id, staff_id")
    .eq("id", body.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "指定されたシフトが見つかりません" },
      { status: 404 }
    );
  }

  const { data: staff } = await supabase
    .from("staffs")
    .select("id")
    .eq("id", existing.staff_id)
    .eq("store_id", storeId)
    .single();

  if (!staff) {
    return NextResponse.json(
      { error: "この操作を行う権限がありません" },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("shifts").delete().eq("id", body.id);

  if (error) {
    return NextResponse.json(
      { error: `シフトの削除に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "シフトを削除しました" });
}
