import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Staff } from "@/lib/types";
import StaffsClient from "./StaffsClient";

export const metadata = { title: "スタッフ管理 | 管理画面" };

export default async function StaffsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/staffs");
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
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <StaffsClient
      storeId={store.id}
      storeName={store.name}
      initialStaffs={(staffs ?? []) as Staff[]}
    />
  );
}
