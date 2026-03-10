import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildThemeStyle } from "@/lib/theme";
import BookingList from "./_components/BookingList";
import ProfileForm from "./_components/ProfileForm";

export const metadata = { title: "マイページ | サロン予約システム" };

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 未ログイン ──
  if (!user) {
    redirect("/login?redirect=/mypage");
  }

  // ── プロフィール & 予約を並列取得 ──
  const [{ data: profile }, { data: bookings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, phone")
      .eq("id", user.id)
      .single(),

    supabase
      .from("bookings")
      .select(
        `
        id, store_id, staff_id, start_at, end_at,
        total_duration, status, created_at,
        staffs ( name, image_url ),
        stores ( name, phone, slug ),
        booking_menus ( menus ( name, duration_minutes ) )
        `,
      )
      .eq("user_id", user.id)
      .order("start_at", { ascending: false }),
  ]);

  // profile が未作成の場合のフォールバック
  const safeProfile = profile ?? {
    id: user.id,
    email: user.email ?? "",
    full_name: "",
    phone: "",
  };

  // 直近の予約から店舗 slug / store_id を取得（予約ボタン・テーマ用）
  const bookingRows = (bookings ?? []) as unknown as Array<{
    store_id: string;
    stores: { name: string; phone: string | null; slug: string } | null;
  }>;
  const firstBooking = bookingRows.find((b) => b.stores?.slug);
  const storeSlug = firstBooking?.stores?.slug ?? null;

  // テーマカラーを取得
  let themeStyle: React.CSSProperties | undefined;
  if (firstBooking?.store_id) {
    const { data: siteSettings } = await supabase
      .from("site_settings")
      .select("theme_color")
      .eq("store_id", firstBooking.store_id)
      .single();

    const primaryHex = (siteSettings?.theme_color as { primary?: string })?.primary;
    themeStyle = buildThemeStyle(primaryHex);
  }

  return (
    <div className="min-h-screen bg-ivory" style={themeStyle}>
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* ── ヘッダー ── */}
        <header className="mb-10 border-b border-greige-light pb-6">
          <h1 className="text-center text-2xl font-black tracking-widest text-charcoal uppercase">
            My Page
          </h1>
          <p className="mt-1 text-center text-xs tracking-[0.3em] text-gold">
            予約確認 &amp; プロフィール
          </p>
        </header>

        {/* ── 予約ボタン ── */}
        {storeSlug && (
          <div className="mb-10">
            <Link
              href={`/${storeSlug}/book`}
              className="block rounded-xl bg-gold py-3.5 text-center text-sm font-bold
                         tracking-widest text-white uppercase transition-all
                         shadow-md shadow-gold/20 hover:bg-gold-light active:scale-[0.98]"
            >
              新しい予約をする
            </Link>
          </div>
        )}

        <div className="space-y-12">
          <ProfileForm profile={safeProfile} />
          {/* Supabase の型推論は generated types なしでは不正確なため明示的にキャスト */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <BookingList bookings={(bookings ?? []) as any} />
        </div>

        {/* ── フッター ── */}
        <footer className="mt-12 border-t border-greige-light pt-4 text-center text-xs text-greige">
          Powered by Yoyaku
        </footer>
      </div>
    </div>
  );
}
