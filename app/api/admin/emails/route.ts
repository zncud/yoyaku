import { NextRequest, NextResponse } from "next/server";
import { requireStoreOwner, isAdminContext } from "@/lib/admin/auth";
import type { MailTemplateConfig } from "@/lib/mail";

/* ── GET: メールテンプレート設定の取得 ── */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId: verifiedStoreId } = result;

  const { data, error } = await supabase
    .from("site_settings")
    .select("mail_config")
    .eq("store_id", verifiedStoreId)
    .single();

  if (error) {
    return NextResponse.json(
      { error: `設定の取得に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    mail_config: (data?.mail_config as MailTemplateConfig) ?? {},
  });
}

/* ── PUT: メールテンプレート設定の更新 ── */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const storeId = body.store_id;

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId: verifiedStoreId } = result;

  const mailConfig: MailTemplateConfig = body.mail_config ?? {};

  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { store_id: verifiedStoreId, mail_config: mailConfig },
      { onConflict: "store_id" },
    );

  if (error) {
    return NextResponse.json(
      { error: `設定の保存に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "メール設定を保存しました" });
}
