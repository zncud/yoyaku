import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmailsClient from "./EmailsClient";
import type { MailTemplateConfig } from "@/lib/mail";

export const metadata = { title: "メール管理 | 管理画面" };

export default async function EmailsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/emails");
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!store) {
    redirect("/");
  }

  const { data: settings } = await supabase
    .from("site_settings")
    .select("mail_config")
    .eq("store_id", store.id)
    .single();

  return (
    <EmailsClient
      storeId={store.id}
      storeName={store.name}
      initialMailConfig={(settings?.mail_config as MailTemplateConfig) ?? {}}
    />
  );
}
