import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export const metadata = { title: "店舗設定 | 管理画面" };

interface StoreData {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  hero_image_url: string | null;
}

interface SiteSettingsData {
  theme_color: { primary: string };
  booking_interval_minutes: number;
  booking_months_ahead: number;
  min_advance_days: number;
}

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/settings");
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, phone, address, description, hero_image_url")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!store) {
    redirect("/");
  }

  const { data: settings } = await supabase
    .from("site_settings")
    .select("theme_color, booking_interval_minutes, booking_months_ahead")
    .eq("store_id", store.id)
    .single();

  return (
    <SettingsClient
      initialStore={store as StoreData}
      initialSettings={{
        theme_color: { primary: "#c4a265" },
        booking_interval_minutes: 30,
        booking_months_ahead: 3,
        min_advance_days: 0,
        ...(settings as Partial<SiteSettingsData>),
      }}
    />
  );
}
