import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingWizard from "./_components/BookingWizard";
import type { Store, Staff, Menu } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. slug から店舗情報を取得
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (storeError || !store) {
    notFound();
  }

  // 2. 店舗に紐づくスタッフ一覧を取得（有効なもののみ、表示順でソート）
  const { data: staffs } = await supabase
    .from("staffs")
    .select("id, store_id, name, description, is_active, display_order")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // 3. 店舗に紐づくメニュー一覧を取得（有効なもののみ、表示順でソート）
  const { data: menus } = await supabase
    .from("menus")
    .select("id, store_id, name, description, duration_minutes, is_active, display_order")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // 4. 予約公開月数を取得
  const { data: siteSettings } = await supabase
    .from("site_settings")
    .select("booking_months_ahead")
    .eq("store_id", store.id)
    .single();

  const bookingMonthsAhead = siteSettings?.booking_months_ahead ?? 3;

  // min_advance_days を別クエリで取得（カラム未作成でもエラーにならない）
  let minAdvanceDays = 0;
  try {
    const { data: advData } = await supabase
      .from("site_settings")
      .select("min_advance_days")
      .eq("store_id", store.id)
      .single();
    if (advData?.min_advance_days != null) {
      minAdvanceDays = advData.min_advance_days;
    }
  } catch {
    // カラム未作成時は無視
  }

  return (
    <BookingWizard
      store={store as Store}
      staffs={(staffs ?? []) as Staff[]}
      menus={(menus ?? []) as Menu[]}
      bookingMonthsAhead={bookingMonthsAhead}
      minAdvanceDays={minAdvanceDays}
    />
  );
}
