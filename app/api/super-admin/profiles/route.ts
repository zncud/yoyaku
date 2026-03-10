import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

/**
 * GET /api/super-admin/profiles?q=検索文字列
 * スーパー管理者によるユーザー検索（氏名・メールの部分一致）
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !SUPER_ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json({ profiles: [] });
  }

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const trimmed = q.trim();

  const { data, error } = await adminDb
    .from("profiles")
    .select("id, full_name, email, phone")
    .or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: `検索に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ profiles: data ?? [] });
}
