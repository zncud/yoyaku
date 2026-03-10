import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/health
 *
 * 認証なしのリクエストには { status: "ok" } のみ返す。
 * CRON_SECRET を Bearer トークンで提示した場合のみ詳細情報を返す。
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // 未認証: 最小限のレスポンスのみ返す（情報漏洩防止）
  if (!isAuthorized) {
    return NextResponse.json({ status: "ok" });
  }

  // 認証済み: DB 接続テストの詳細を返す
  const supabase = await createClient();

  const [storesRes, staffsRes, menusRes] = await Promise.all([
    supabase.from("stores").select("id").limit(1),
    supabase.from("staffs").select("id").limit(1),
    supabase.from("menus").select("id").limit(1),
  ]);

  return NextResponse.json({
    status: "ok",
    tables: {
      stores: { ok: !storesRes.error, error: storesRes.error?.message ?? null },
      staffs: { ok: !staffsRes.error, error: staffsRes.error?.message ?? null },
      menus:  { ok: !menusRes.error,  error: menusRes.error?.message ?? null },
    },
  });
}
