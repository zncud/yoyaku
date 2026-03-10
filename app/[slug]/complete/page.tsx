import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ booking_id?: string }>;
}

export default async function CompletePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { booking_id } = await searchParams;
  const supabase = await createClient();

  // 店舗情報の取得
  const { data: store } = await supabase
    .from("stores")
    .select("name, phone, slug")
    .eq("slug", slug)
    .single();

  if (!store) {
    notFound();
  }

  // 予約詳細の取得（booking_id がある場合）
  let bookingDetail: {
    start_at: string;
    total_duration: number;
    staff_name: string;
    menus: string[];
  } | null = null;

  if (booking_id) {
    // 予約データは RLS でブロックされる可能性があるため、service_role で取得
    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: booking } = await adminDb
      .from("bookings")
      .select("start_at, total_duration, staffs(name)")
      .eq("id", booking_id)
      .single();

    const { data: bookingMenus } = await adminDb
      .from("booking_menus")
      .select("menus(name)")
      .eq("booking_id", booking_id);

    if (booking) {
      const staffData = booking.staffs as unknown as { name: string } | null;
      const menuNames = (bookingMenus ?? []).map(
        (bm) => (bm.menus as unknown as { name: string })?.name
      ).filter(Boolean);

      bookingDetail = {
        start_at: booking.start_at,
        total_duration: booking.total_duration,
        staff_name: staffData?.name ?? "未定",
        menus: menuNames,
      };
    }
  }

  // JST 表示用のフォーマット
  function formatJst(isoString: string): string {
    const date = new Date(isoString);
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const d = String(jst.getUTCDate()).padStart(2, "0");
    const h = String(jst.getUTCHours()).padStart(2, "0");
    const min = String(jst.getUTCMinutes()).padStart(2, "0");
    const dow = ["日", "月", "火", "水", "木", "金", "土"][jst.getUTCDay()];
    return `${y}年${m}月${d}日（${dow}）${h}:${min}`;
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}分`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  }

  return (
    <div className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-xl">
        {/* Header — 予約ウィザードと統一 */}
        <header className="border-b border-greige-light px-6 pt-8 pb-4">
          <h1 className="text-center text-2xl font-black tracking-widest text-charcoal uppercase">
            Booking Complete
          </h1>
          <p className="mt-1 text-center text-xs tracking-[0.3em] text-gold">
            {store.name}
          </p>
        </header>

        <div className="px-4 py-10">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold shadow-lg shadow-gold/25">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Subtitle */}
        <p className="mt-6 text-center text-sm font-medium text-slate">
          ご予約が完了しました
        </p>

        {/* Booking Detail */}
        {bookingDetail && (
          <div className="mt-8 rounded-xl border border-greige-light bg-white overflow-hidden shadow-sm">
            <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
            <div className="divide-y divide-ivory-dark p-5 space-y-0">
              <div className="py-3">
                <p className="text-xs font-medium text-greige uppercase tracking-wider">日時</p>
                <p className="mt-1 font-semibold text-charcoal">{formatJst(bookingDetail.start_at)}</p>
              </div>
              <div className="py-3">
                <p className="text-xs font-medium text-greige uppercase tracking-wider">担当スタッフ</p>
                <p className="mt-1 font-semibold text-charcoal">{bookingDetail.staff_name}</p>
              </div>
              <div className="py-3">
                <p className="text-xs font-medium text-greige uppercase tracking-wider">メニュー</p>
                <p className="mt-1 font-semibold text-charcoal">{bookingDetail.menus.join("、")}</p>
              </div>
              <div className="py-3">
                <p className="text-xs font-medium text-greige uppercase tracking-wider">所要時間</p>
                <p className="mt-1 font-semibold text-charcoal">{formatDuration(bookingDetail.total_duration)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        <div className="mt-8 rounded-xl border border-greige-light bg-white p-5 shadow-sm">
          <p className="text-sm leading-relaxed text-slate">
            ご予約ありがとうございます。
            ご予約内容の確認メールをお送りいたします。
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate">
            設定したパスワードで次回からログインが可能です。
            マイページから予約履歴をご確認いただけます。
          </p>
        </div>

        {/* Cancel Notice */}
        {store.phone && (
          <div className="mt-6 rounded-xl border border-gold/20 bg-gold/5 p-4 text-center">
            <p className="text-xs text-slate">
              キャンセル・変更のご連絡はお電話にてお願いいたします
            </p>
            <a
              href={`tel:${store.phone.replace(/-/g, "")}`}
              className="mt-2 inline-flex items-center gap-2 text-lg font-bold tracking-wider text-gold-dark transition-colors hover:text-gold"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {store.phone}
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={`/${slug}`}
            className="block rounded-xl bg-gold py-3.5 text-center text-sm font-bold
                       tracking-widest text-white uppercase transition-all
                       shadow-md shadow-gold/20 hover:bg-gold-light active:scale-[0.98]"
          >
            店舗トップへ戻る
          </Link>
          <Link
            href="/mypage"
            className="block rounded-xl border border-greige-light py-3.5 text-center
                       text-sm font-medium text-slate transition-all
                       hover:border-greige hover:text-charcoal"
          >
            マイページへ
          </Link>
        </div>

        </div>{/* end .px-4.py-10 */}

        {/* Footer — 予約ウィザードと統一 */}
        <footer className="border-t border-greige-light px-6 py-4 text-center text-xs text-greige">
          Powered by Yoyaku
        </footer>
      </div>
    </div>
  );
}
