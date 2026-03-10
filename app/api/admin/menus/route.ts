import { NextRequest, NextResponse } from "next/server";
import { requireStoreOwner, isAdminContext } from "@/lib/admin/auth";

/* ── リクエスト型定義 ── */
interface MenuCreateBody {
  store_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  display_order?: number;
}

interface MenuUpdateBody {
  id: string;
  store_id: string;
  name?: string;
  description?: string;
  duration_minutes?: number;
  is_active?: boolean;
  display_order?: number;
}

interface MenuReorderBody {
  store_id: string;
  /** メニューIDの配列（並び順通り） */
  order: string[];
}

/* ── GET: メニュー一覧取得 ── */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId: verifiedStoreId } = result;

  const { data, error } = await supabase
    .from("menus")
    .select("id, name, description, duration_minutes, is_active, display_order")
    .eq("store_id", verifiedStoreId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: `メニュー一覧の取得に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ menus: data });
}

/* ── POST: メニュー追加 ── */
export async function POST(req: NextRequest) {
  const body: MenuCreateBody = await req.json();

  // バリデーション
  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: "メニュー名は必須です" },
      { status: 400 }
    );
  }
  if (!body.duration_minutes || body.duration_minutes <= 0) {
    return NextResponse.json(
      { error: "施術時間（分）は1以上の整数で指定してください" },
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
      .from("menus")
      .select("display_order")
      .eq("store_id", storeId)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    displayOrder = (maxRow?.display_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("menus")
    .insert({
      store_id: storeId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      duration_minutes: body.duration_minutes,
      display_order: displayOrder,
    })
    .select("id, name, description, duration_minutes, is_active, display_order")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `メニューの追加に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ menu: data }, { status: 201 });
}

/* ── PUT: メニュー編集 ── */
export async function PUT(req: NextRequest) {
  const body: MenuUpdateBody = await req.json();

  if (!body.id) {
    return NextResponse.json(
      { error: "メニューIDは必須です" },
      { status: 400 }
    );
  }

  const result = await requireStoreOwner(body.store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  // 更新対象がこのストアに属しているか確認
  const { data: existing, error: fetchError } = await supabase
    .from("menus")
    .select("id")
    .eq("id", body.id)
    .eq("store_id", storeId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "指定されたメニューが見つかりません" },
      { status: 404 }
    );
  }

  // 更新フィールドを構築
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.duration_minutes !== undefined) {
    if (body.duration_minutes <= 0) {
      return NextResponse.json(
        { error: "施術時間（分）は1以上の整数で指定してください" },
        { status: 400 }
      );
    }
    updates.duration_minutes = body.duration_minutes;
  }
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.display_order !== undefined) updates.display_order = body.display_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "更新するフィールドが指定されていません" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("menus")
    .update(updates)
    .eq("id", body.id)
    .eq("store_id", storeId)
    .select("id, name, description, duration_minutes, is_active, display_order")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `メニューの更新に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ menu: data });
}

/* ── DELETE: メニュー削除 ── */
export async function DELETE(req: NextRequest) {
  const body: { id: string; store_id: string } = await req.json();

  if (!body.id) {
    return NextResponse.json(
      { error: "メニューIDは必須です" },
      { status: 400 }
    );
  }

  const result = await requireStoreOwner(body.store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  const { error } = await supabase
    .from("menus")
    .delete()
    .eq("id", body.id)
    .eq("store_id", storeId);

  if (error) {
    return NextResponse.json(
      { error: `メニューの削除に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "メニューを削除しました",
  });
}

/* ── PATCH: メニュー並び替え（display_order 一括更新） ── */
export async function PATCH(req: NextRequest) {
  const body: MenuReorderBody = await req.json();

  if (!body.order?.length) {
    return NextResponse.json(
      { error: "並び順の配列（order）は必須です" },
      { status: 400 }
    );
  }

  const result = await requireStoreOwner(body.store_id);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId } = result;

  // 指定されたメニューが全てこのストアに属しているか確認
  const { data: existingMenus, error: fetchError } = await supabase
    .from("menus")
    .select("id")
    .eq("store_id", storeId)
    .in("id", body.order);

  if (fetchError) {
    return NextResponse.json(
      { error: `メニューの検証に失敗しました: ${fetchError.message}` },
      { status: 500 }
    );
  }

  const existingIds = new Set(existingMenus?.map((m) => m.id) || []);
  const invalidIds = body.order.filter((id) => !existingIds.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `存在しないメニューIDが含まれています: ${invalidIds.join(", ")}` },
      { status: 400 }
    );
  }

  // display_order を一括更新
  const updates = body.order.map((id, index) =>
    supabase
      .from("menus")
      .update({ display_order: index })
      .eq("id", id)
      .eq("store_id", storeId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json(
      { error: `並び替えの更新に失敗しました: ${failed.error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "メニューの並び順を更新しました",
    order: body.order,
  });
}
