import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  // 本番環境では完全に無効化
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY が設定されていません" },
      { status: 500 }
    );
  }

  // service_role キーで RLS をバイパスするクライアント
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // 1. テスト用オーナーユーザーを作成
  const testEmail = "salon.owner.test@gmail.com";
  const testPassword = "password123456";
  let userId: string | null = null;

  const { data: createData } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: "テスト オーナー", phone: "090-1234-5678" },
  });
  userId = createData?.user?.id ?? null;

  // 既に存在する場合はリストから検索
  if (!userId) {
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = listData?.users?.find((u) => u.email === testEmail);
    userId = existing?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json(
      { error: "テストユーザーの作成に失敗しました" },
      { status: 500 }
    );
  }

  // 2. 店舗を作成（upsert: slug が一意制約）
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .upsert(
      {
        name: "SALON DEMO",
        slug: "demo",
        phone: "03-1234-5678",
        address: "東京都渋谷区神南1-2-3",
        description: "デモ用サロンです",
        owner_id: userId,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (storeErr || !store) {
    return NextResponse.json(
      { error: "店舗の作成に失敗しました", detail: storeErr?.message },
      { status: 500 }
    );
  }

  // 3. 既存データを削除してからスタッフを作成
  await supabase.from("staffs").delete().eq("store_id", store.id);
  const { data: staffs, error: staffErr } = await supabase
    .from("staffs")
    .insert([
      { store_id: store.id, name: "田中 優子", description: "カット・カラーのスペシャリスト。10年以上の経験。", role: "manager", display_order: 0 },
      { store_id: store.id, name: "佐藤 健太", description: "メンズカットに定評あり。トレンドスタイルをご提案。", role: "staff", display_order: 1 },
      { store_id: store.id, name: "鈴木 美咲", description: "ヘッドスパ・トリートメントが得意。癒しの施術。", role: "staff", display_order: 2 },
    ])
    .select();

  // 4. 既存データを削除してからメニューを作成
  await supabase.from("menus").delete().eq("store_id", store.id);
  const { data: menus, error: menuErr } = await supabase
    .from("menus")
    .insert([
      { store_id: store.id, name: "カット", description: "シャンプー・ブロー込み", duration_minutes: 60, display_order: 0 },
      { store_id: store.id, name: "カラー", description: "リタッチ・フルカラー対応", duration_minutes: 90, display_order: 1 },
      { store_id: store.id, name: "パーマ", description: "デジタルパーマ・コールドパーマ対応", duration_minutes: 120, display_order: 2 },
      { store_id: store.id, name: "トリートメント", description: "髪質改善トリートメント", duration_minutes: 30, display_order: 3 },
      { store_id: store.id, name: "ヘッドスパ", description: "頭皮ケア・リラクゼーション", duration_minutes: 45, display_order: 4 },
    ])
    .select();

  // 5. サイト設定を作成
  await supabase
    .from("site_settings")
    .upsert({ store_id: store.id, booking_interval_minutes: 30 })
    .select();

  // 6. スタッフのシフトデータを生成（2週間分）
  let shiftCount = 0;
  let shiftError: string | null = null;

  if (staffs && staffs.length > 0) {
    // 既存シフトを削除
    const staffIds = staffs.map((s: { id: string }) => s.id);
    await supabase.from("shifts").delete().in("staff_id", staffIds);

    // 今日から14日分のシフトを生成
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // スタッフごとのシフトパターン定義
    //   田中 優子: 火〜土 10:00-19:00 (日月休み)、13:00-14:00 昼休憩
    //   佐藤 健太: 月〜金 10:00-20:00 (土日休み)、13:00-14:00 昼休憩
    //   鈴木 美咲: 水〜日 11:00-20:00 (月火休み)、14:00-15:00 昼休憩
    const shiftPatterns: Record<
      number,
      { workDays: number[]; startHour: number; endHour: number; breakStart: number; breakEnd: number }
    > = {
      0: { workDays: [2, 3, 4, 5, 6], startHour: 10, endHour: 19, breakStart: 13, breakEnd: 14 }, // 田中
      1: { workDays: [1, 2, 3, 4, 5], startHour: 10, endHour: 20, breakStart: 13, breakEnd: 14 }, // 佐藤
      2: { workDays: [0, 3, 4, 5, 6], startHour: 11, endHour: 20, breakStart: 14, breakEnd: 15 }, // 鈴木
    };

    const shiftRows: { staff_id: string; start_at: string; end_at: string; type: string }[] = [];

    for (let staffIdx = 0; staffIdx < staffs.length; staffIdx++) {
      const staff = staffs[staffIdx];
      const pattern = shiftPatterns[staffIdx] ?? shiftPatterns[0];

      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const date = new Date(today);
        date.setDate(date.getDate() + dayOffset);
        const dayOfWeek = date.getDay(); // 0=日, 1=月, ...

        if (!pattern.workDays.includes(dayOfWeek)) {
          // 公休日
          const holidayStart = new Date(date);
          holidayStart.setHours(0, 0, 0, 0);
          const holidayEnd = new Date(date);
          holidayEnd.setHours(23, 59, 59, 0);
          shiftRows.push({
            staff_id: staff.id,
            start_at: holidayStart.toISOString(),
            end_at: holidayEnd.toISOString(),
            type: "holiday",
          });
          continue;
        }

        // 出勤シフト (JST で時間を設定し UTC に変換: JST = UTC+9)
        const workStart = new Date(date);
        workStart.setHours(pattern.startHour - 9, 0, 0, 0); // JST→UTC
        const workEnd = new Date(date);
        workEnd.setHours(pattern.endHour - 9, 0, 0, 0);
        shiftRows.push({
          staff_id: staff.id,
          start_at: workStart.toISOString(),
          end_at: workEnd.toISOString(),
          type: "work",
        });

        // 昼休憩
        const breakStart = new Date(date);
        breakStart.setHours(pattern.breakStart - 9, 0, 0, 0);
        const breakEnd = new Date(date);
        breakEnd.setHours(pattern.breakEnd - 9, 0, 0, 0);
        shiftRows.push({
          staff_id: staff.id,
          start_at: breakStart.toISOString(),
          end_at: breakEnd.toISOString(),
          type: "break",
        });
      }
    }

    const { data: shifts, error: sErr } = await supabase
      .from("shifts")
      .insert(shiftRows)
      .select();
    shiftCount = shifts?.length ?? 0;
    shiftError = sErr?.message ?? null;
  }

  return NextResponse.json({
    status: "seeded",
    userId,
    store: { id: store.id, slug: store.slug, name: store.name },
    staffs: { count: staffs?.length ?? 0, error: staffErr?.message ?? null },
    menus: { count: menus?.length ?? 0, error: menuErr?.message ?? null },
    shifts: { count: shiftCount, error: shiftError },
  });
}
