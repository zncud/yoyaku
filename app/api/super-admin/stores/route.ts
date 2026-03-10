import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// 全角英数字・大小文字の揺らぎを吸収して正規化する
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().normalize("NFKC");
}

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map(normalizeEmail)
  .filter(Boolean);

/**
 * POST /api/super-admin/stores
 * 新規店舗の作成 + オーナーアカウント割当
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // スーパー管理者認証
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !SUPER_ADMIN_EMAILS.includes(normalizeEmail(user.email ?? ""))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const body = await req.json();
  const { name, slug, phone, address, owner_email } = body;

  if (!name || !slug || !owner_email) {
    return NextResponse.json(
      { error: "name, slug, owner_email は必須です" },
      { status: 400 },
    );
  }

  // スラッグ形式の検証
  const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json(
      { error: "スラッグは英小文字・数字・ハイフンのみ使用可能です（先頭と末尾はハイフン不可）" },
      { status: 400 },
    );
  }

  // 予約語との衝突チェック
  const RESERVED_SLUGS = ["admin", "api", "auth", "super-admin", "login", "signup", "logout", "webhooks", "cron", "_next", "public"];
  if (RESERVED_SLUGS.includes(slug)) {
    return NextResponse.json(
      { error: `"${slug}" はシステム予約語のため使用できません` },
      { status: 400 },
    );
  }

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // slug の重複チェック
  const { data: existing } = await adminDb
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: `スラッグ "${slug}" は既に使用されています` },
      { status: 409 },
    );
  }

  // オーナーアカウントの検索 or 作成
  let ownerId: string;

  // 既存ユーザーを検索
  const { data: users } = await adminDb.auth.admin.listUsers();
  const existingUser = users?.users.find((u) => u.email === owner_email);

  if (existingUser) {
    ownerId = existingUser.id;
  } else {
    // 新規ユーザーを作成（ランダムパスワード生成）
    const randomPassword = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
    const { data: newUser, error: createErr } = await adminDb.auth.admin.createUser({
      email: owner_email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name: name + " オーナー" },
    });

    if (createErr || !newUser.user) {
      return NextResponse.json(
        { error: `オーナーアカウントの作成に失敗しました: ${createErr?.message}` },
        { status: 500 },
      );
    }
    ownerId = newUser.user.id;
  }

  // 店舗を作成
  const { data: store, error: storeErr } = await adminDb
    .from("stores")
    .insert({
      name,
      slug,
      phone: phone || null,
      address: address || null,
      owner_id: ownerId,
    })
    .select("id")
    .single();

  if (storeErr) {
    return NextResponse.json(
      { error: `店舗の作成に失敗しました: ${storeErr.message}` },
      { status: 500 },
    );
  }

  // site_settings を初期化
  await adminDb.from("site_settings").insert({
    store_id: store.id,
    theme_color: { primary: "#c4a265" },
    booking_interval_minutes: 30,
  });

  // デフォルト営業時間を挿入（月〜土: 10:00-19:00, 日: 定休）
  // 営業時間が未設定だと空き枠が一切表示されないため、必ず初期値を設定する
  const defaultHours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    store_id: store.id,
    day_of_week: day,
    open_time: "10:00",
    close_time: "19:00",
    is_open: day !== 0, // 0=日曜のみ定休
  }));
  await adminDb.from("store_hours").insert(defaultHours);

  return NextResponse.json({
    success: true,
    store_id: store.id,
    is_new_owner: !existingUser,
    message: !existingUser
      ? "新規オーナーアカウントを作成しました。オーナーにパスワードリセットを案内してください。"
      : undefined,
  });
}

/**
 * DELETE /api/super-admin/stores
 * 店舗と関連データの削除
 */
/**
 * PATCH /api/super-admin/stores
 * 店舗のオーナーを変更
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !SUPER_ADMIN_EMAILS.includes(normalizeEmail(user.email ?? ""))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const body = await req.json();
  const { store_id, owner_id } = body;

  if (!store_id || !owner_id) {
    return NextResponse.json(
      { error: "store_id, owner_id は必須です" },
      { status: 400 },
    );
  }

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await adminDb
    .from("stores")
    .update({ owner_id })
    .eq("id", store_id);

  if (error) {
    return NextResponse.json(
      { error: `オーナーの更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/super-admin/stores
 * 店舗と関連データの削除
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !SUPER_ADMIN_EMAILS.includes(normalizeEmail(user.email ?? ""))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const body = await req.json();
  const { store_id } = body;

  if (!store_id) {
    return NextResponse.json(
      { error: "store_id は必須です" },
      { status: 400 },
    );
  }

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // FK 制約を考慮した削除順序

  // 1. booking_menus (bookings 経由)
  const { data: bookings } = await adminDb
    .from("bookings")
    .select("id")
    .eq("store_id", store_id);
  const bookingIds = (bookings ?? []).map((b) => b.id);
  if (bookingIds.length > 0) {
    await adminDb.from("booking_menus").delete().in("booking_id", bookingIds);
  }

  // 2. bookings
  await adminDb.from("bookings").delete().eq("store_id", store_id);

  // 3. shifts (staffs 経由)
  const { data: staffs } = await adminDb
    .from("staffs")
    .select("id")
    .eq("store_id", store_id);
  const staffIds = (staffs ?? []).map((s) => s.id);
  if (staffIds.length > 0) {
    await adminDb.from("shifts").delete().in("staff_id", staffIds);
  }

  // 4. menus
  await adminDb.from("menus").delete().eq("store_id", store_id);

  // 5. staffs
  await adminDb.from("staffs").delete().eq("store_id", store_id);

  // 6. store_hours
  await adminDb.from("store_hours").delete().eq("store_id", store_id);

  // 7. site_settings
  await adminDb.from("site_settings").delete().eq("store_id", store_id);

  // 8. stores
  const { error: deleteErr } = await adminDb
    .from("stores")
    .delete()
    .eq("id", store_id);

  if (deleteErr) {
    return NextResponse.json(
      { error: `店舗の削除に失敗しました: ${deleteErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
