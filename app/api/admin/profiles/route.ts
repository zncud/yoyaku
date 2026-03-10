import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireStoreOwner, isAdminContext } from "@/lib/admin/auth";

/**
 * PostgREST フィルタ構文に影響する特殊文字をエスケープ
 */
function sanitizeForPostgrest(input: string): string {
  // PostgREST のフィルタ構文で意味を持つ文字を除去
  return input.replace(/[%_\\(),."']/g, "");
}

/**
 * GET /api/admin/profiles?store_id=xxx&q=検索文字列
 * 管理者によるユーザー検索（自店舗の顧客のみ、氏名・メール・電話の部分一致）
 */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  const q = req.nextUrl.searchParams.get("q") ?? "";

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { storeId: verifiedStoreId } = result;

  const trimmed = q.trim();
  if (!trimmed) {
    return NextResponse.json({ profiles: [] });
  }

  // 入力のサニタイズ（PostgREST フィルタインジェクション防止）
  const sanitized = sanitizeForPostgrest(trimmed);
  if (!sanitized) {
    return NextResponse.json({ profiles: [] });
  }

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 自店舗の顧客のみに限定して検索
  const { data, error } = await adminDb
    .from("profiles")
    .select("id, full_name, email, phone")
    .eq("store_id", verifiedStoreId)
    .or(`full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`)
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: "検索に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.json({ profiles: data ?? [] });
}
