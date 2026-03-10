import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Menu } from "@/lib/types";
import MenusClient from "./MenusClient";

export const metadata = { title: "メニュー管理 | 管理画面" };

export default async function MenusPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/menus");
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

  const { data: menus } = await supabase
    .from("menus")
    .select("id, store_id, name, description, duration_minutes, is_active, display_order")
    .eq("store_id", store.id)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <MenusClient
      storeId={store.id}
      storeName={store.name}
      initialMenus={(menus ?? []) as Menu[]}
    />
  );
}
