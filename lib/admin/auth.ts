import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminContext {
  supabase: SupabaseClient;
  userId: string;
  storeId: string;
}

/**
 * 管理者権限チェック
 * - ログイン済みか確認
 * - 指定された store_id のオーナーであるか確認
 * - RLS に加え API レイヤーでも所有権を検証する多層防御
 */
export async function requireStoreOwner(
  storeId: string | null
): Promise<AdminContext | NextResponse> {
  if (!storeId) {
    return NextResponse.json(
      { error: "store_id は必須です" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // セッションからユーザーを取得
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "認証が必要です。ログインしてください。" },
      { status: 401 }
    );
  }

  // ストアの所有権を確認
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, owner_id")
    .eq("id", storeId)
    .single();

  if (storeError || !store) {
    return NextResponse.json(
      { error: "指定されたストアが見つかりません" },
      { status: 404 }
    );
  }

  if (store.owner_id !== user.id) {
    return NextResponse.json(
      { error: "この操作を行う権限がありません" },
      { status: 403 }
    );
  }

  return { supabase, userId: user.id, storeId };
}

/** AdminContext かエラーレスポンスかを判定 */
export function isAdminContext(
  result: AdminContext | NextResponse
): result is AdminContext {
  return "supabase" in result;
}
