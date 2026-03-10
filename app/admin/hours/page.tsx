import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HoursClient from "./HoursClient";

export const metadata = { title: "営業時間 | 管理画面" };

export default async function HoursPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/hours");
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

  // 営業時間を取得
  const { data: hoursData } = await supabase
    .from("store_hours")
    .select("day_of_week, open_time, close_time, is_open")
    .eq("store_id", store.id)
    .order("day_of_week");

  return (
    <HoursClient
      storeId={store.id}
      storeName={store.name}
      initialHours={hoursData ?? []}
    />
  );
}
