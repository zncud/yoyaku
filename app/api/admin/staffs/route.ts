import { NextRequest, NextResponse } from "next/server";
import { requireStoreOwner, isAdminContext } from "@/lib/admin/auth";

/* ── リクエスト型定義 ── */
interface StaffCreateBody {
  store_id: string;
  name: string;
  description?: string;
  display_order?: number;
}

interface StaffUpdateBody {
  id: string;
  store_id: string;
  name?: string;
  description?: string;
  is_active?: boolean;
  display_order?: number;
}

interface StaffDeleteBody {
  id: string;
  store_id: string;
}

/* ── GET: スタッフ一覧取得 ── */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId: verifiedStoreId } = result;

  const { data, error } = await supabase
    .from("staffs")
    .select("id, name, description, is_active, display_order, created_at")
    .eq("store_id", verifiedStoreId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: `スタッフ一覧の取得に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ staffs: data });
}

/* ── POST: スタッフ追加 ── */
export async function POST(req: NextRequest) {
  const body: StaffCreateBody = await req.json();

  // バリデーション
  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: "スタッフ名は必須です" },
      { status: 400 }
    );
  }

  const result = await requireStoreOwner(body.store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  // display_order が未指定の場合、既存の最大値 + 1 を設定
  let displayOrder = body.display_order;
  if (displayOrder === undefined) {
    const { data: maxRow } = await supabase
      .from("staffs")
      .select("display_order")
      .eq("store_id", storeId)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    displayOrder = (maxRow?.display_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("staffs")
    .insert({
      store_id: storeId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      display_order: displayOrder,
    })
    .select("id, name, description, is_active, display_order")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `スタッフの追加に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ staff: data }, { status: 201 });
}

/* ── PUT: スタッフ編集 ── */
export async function PUT(req: NextRequest) {
  const body: StaffUpdateBody = await req.json();

  if (!body.id) {
    return NextResponse.json(
      { error: "スタッフIDは必須です" },
      { status: 400 }
    );
  }

  const result = await requireStoreOwner(body.store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  // 更新対象のスタッフがこのストアに属しているか確認
  const { data: existing, error: fetchError } = await supabase
    .from("staffs")
    .select("id")
    .eq("id", body.id)
    .eq("store_id", storeId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "指定されたスタッフが見つかりません" },
      { status: 404 }
    );
  }

  // 更新フィールドを構築（undefinedのフィールドは更新しない）
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.display_order !== undefined) updates.display_order = body.display_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "更新するフィールドが指定されていません" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("staffs")
    .update(updates)
    .eq("id", body.id)
    .eq("store_id", storeId)
    .select("id, name, description, is_active, display_order")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `スタッフの更新に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ staff: data });
}

/* ── DELETE: スタッフ無効化（論理削除） ── */
// 物理削除すると過去の予約レコードの staff_id が孤立するため、
// is_active = false に設定する論理削除を採用する
export async function DELETE(req: NextRequest) {
  const body: StaffDeleteBody = await req.json();

  if (!body.id) {
    return NextResponse.json(
      { error: "スタッフIDは必須です" },
      { status: 400 }
    );
  }

  const result = await requireStoreOwner(body.store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  // 対象スタッフがこのストアに属しているか確認
  const { data: existing } = await supabase
    .from("staffs")
    .select("id")
    .eq("id", body.id)
    .eq("store_id", storeId)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "指定されたスタッフが見つかりません" },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("staffs")
    .update({ is_active: false })
    .eq("id", body.id)
    .eq("store_id", storeId);

  if (error) {
    return NextResponse.json(
      { error: `スタッフの無効化に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "スタッフを無効化しました",
  });
}
