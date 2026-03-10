import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Staff, Menu } from "@/lib/types";
import AdminBookingClient from "./AdminBookingClient";

export const metadata = { title: "予約作成 | 管理画面" };

export default async function AdminBookingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/bookings");
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

  const [{ data: staffs }, { data: menus }] = await Promise.all([
    supabase
      .from("staffs")
      .select("id, store_id, name, description, is_active, display_order")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("menus")
      .select("id, store_id, name, description, duration_minutes, is_active, display_order")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ]);

  return (
    <AdminBookingClient
      storeId={store.id}
      storeName={store.name}
      staffs={(staffs ?? []) as Staff[]}
      menus={(menus ?? []) as Menu[]}
    />
  );
}
