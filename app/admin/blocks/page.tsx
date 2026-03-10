import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Staff } from "@/lib/types";
import BlocksClient from "./BlocksClient";

export const metadata = { title: "シフトブロック | 管理画面" };

export default async function BlocksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/blocks");
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

  const { data: staffs } = await supabase
    .from("staffs")
    .select("id, store_id, name, description, is_active, display_order")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (
    <BlocksClient
      storeId={store.id}
      storeName={store.name}
      staffs={(staffs ?? []) as Staff[]}
    />
  );
}
