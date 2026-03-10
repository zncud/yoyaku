import { NextRequest, NextResponse } from "next/server";
import { requireStoreOwner, isAdminContext } from "@/lib/admin/auth";

/* ── GET: 店舗設定の取得 ── */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId: verifiedStoreId } = result;

  // 店舗情報 + サイト設定を並列取得
  const [storeRes, settingsRes] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug, phone, address, description, hero_image_url")
      .eq("id", verifiedStoreId)
      .single(),

    supabase
      .from("site_settings")
      .select("theme_color, booking_interval_minutes, booking_months_ahead")
      .eq("store_id", verifiedStoreId)
      .single(),
  ]);

  if (storeRes.error) {
    return NextResponse.json(
      { error: `店舗情報の取得に失敗しました: ${storeRes.error.message}` },
      { status: 500 }
    );
  }

  const defaultSettings = {
    theme_color: { primary: "#c4a265" },
    booking_interval_minutes: 30,
    booking_months_ahead: 3,
    min_advance_days: 0,
  };

  // min_advance_days を別クエリで取得（カラム未作成でもエラーにならない）
  let minAdvanceDays = 0;
  try {
    const { data: advData } = await supabase
      .from("site_settings")
      .select("min_advance_days")
      .eq("store_id", verifiedStoreId)
      .single();
    if (advData?.min_advance_days != null) {
      minAdvanceDays = advData.min_advance_days;
    }
  } catch {
    // カラム未作成時は無視
  }

  return NextResponse.json({
    store: storeRes.data,
    settings: {
      ...defaultSettings,
      ...settingsRes.data,
      min_advance_days: minAdvanceDays,
    },
  });
}

/* ── PUT: 店舗設定の更新 ── */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const storeId = body.store_id;

  const result = await requireStoreOwner(storeId);
  if (!isAdminContext(result)) return result;

  const { supabase, storeId: verifiedStoreId } = result;

  // ── 店舗情報の更新 ──
  const storeUpdates: Record<string, unknown> = {};
  if (body.name !== undefined) storeUpdates.name = body.name;
  if (body.phone !== undefined) storeUpdates.phone = body.phone || null;
  if (body.address !== undefined) storeUpdates.address = body.address || null;
  if (body.description !== undefined) storeUpdates.description = body.description || null;
  if (body.hero_image_url !== undefined) storeUpdates.hero_image_url = body.hero_image_url || null;

  if (Object.keys(storeUpdates).length > 0) {
    const { error: storeErr } = await supabase
      .from("stores")
      .update(storeUpdates)
      .eq("id", verifiedStoreId);

    if (storeErr) {
      return NextResponse.json(
        { error: `店舗情報の更新に失敗しました: ${storeErr.message}` },
        { status: 500 }
      );
    }
  }

  // ── サイト設定の更新 ──
  const siteUpdates: Record<string, unknown> = {};
  if (body.theme_color !== undefined) siteUpdates.theme_color = body.theme_color;
  if (body.booking_interval_minutes !== undefined) {
    const interval = parseInt(body.booking_interval_minutes, 10);
    if (isNaN(interval) || interval < 5 || interval > 120) {
      return NextResponse.json(
        { error: "予約間隔は5〜120分の範囲で指定してください" },
        { status: 400 }
      );
    }
    siteUpdates.booking_interval_minutes = interval;
  }
  if (body.booking_months_ahead !== undefined) {
    const months = parseInt(body.booking_months_ahead, 10);
    if (isNaN(months) || months < 1 || months > 12) {
      return NextResponse.json(
        { error: "予約公開月数は1〜12の範囲で指定してください" },
        { status: 400 }
      );
    }
    siteUpdates.booking_months_ahead = months;
  }
  if (body.min_advance_days !== undefined) {
    const days = parseInt(body.min_advance_days, 10);
    if (isNaN(days) || days < 0 || days > 30) {
      return NextResponse.json(
        { error: "予約受付日数は0〜30の範囲で指定してください" },
        { status: 400 }
      );
    }
    siteUpdates.min_advance_days = days;
  }

  if (Object.keys(siteUpdates).length > 0) {
    const { error: settingsErr } = await supabase
      .from("site_settings")
      .upsert(
        { store_id: verifiedStoreId, ...siteUpdates },
        { onConflict: "store_id" }
      );

    if (settingsErr) {
      return NextResponse.json(
        { error: `サイト設定の更新に失敗しました: ${settingsErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ message: "設定を保存しました" });
}
