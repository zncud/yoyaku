import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().normalize("NFKC");
}

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map(normalizeEmail)
  .filter(Boolean);

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ redirect: "/login" });
  }

  // 1. スーパー管理者
  if (SUPER_ADMIN_EMAILS.includes(normalizeEmail(user.email ?? ""))) {
    return NextResponse.json({ redirect: "/super-admin" });
  }

  // 2. 店舗オーナー
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: store } = await adminDb
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .single();

  if (store) {
    return NextResponse.json({ redirect: "/admin/dashboard" });
  }

  // 3. 一般ユーザー
  return NextResponse.json({ redirect: "/mypage" });
}
