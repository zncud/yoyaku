import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Staff } from "@/lib/types";
import CalendarClient from "./CalendarClient";

export const metadata = { title: "予約台帳 | 管理画面" };

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/calendar");
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

  // アクティブなスタッフ一覧を取得
  const { data: staffs } = await supabase
    .from("staffs")
    .select("id, store_id, name, description, is_active, display_order")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (
    <CalendarClient
      storeId={store.id}
      storeName={store.name}
      staffs={(staffs ?? []) as Staff[]}
    />
  );
}
