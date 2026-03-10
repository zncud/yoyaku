import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const metadata = { title: "ダッシュボード | 管理画面" };

/* ── JST helpers ── */
function todayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function formatTime(utc: string): string {
  return new Date(utc).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  reserved:  { label: "確定",       cls: "bg-gold/15 text-gold-dark border border-gold/30" },
  completed: { label: "完了",       cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  cancelled: { label: "キャンセル", cls: "bg-gray-100 text-gray-400 border border-gray-200" },
};

interface RawBooking {
  id: string;
  start_at: string;
  end_at: string;
  total_duration: number;
  status: string;
  user_id: string;
  staffs: { name: string } | null;
  booking_menus: Array<{ menus: { name: string } | null }>;
}

interface DashboardBooking extends RawBooking {
  customer_name: string;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  /* ── 認証チェック ── */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/dashboard");
  }

  /* ── オーナーの store を取得（複数店舗が存在しても最初の1件を返す） ── */
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!store) {
    redirect("/");
  }

  /* ── 今日の予約一覧を取得（JST ベース） ── */
  const today = todayJST();
  const dayStartUTC = new Date(`${today}T00:00:00+09:00`).toISOString();
  const dayEndUTC = new Date(`${today}T23:59:59+09:00`).toISOString();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `
      id, start_at, end_at, total_duration, status, user_id,
      staffs ( name ),
      booking_menus ( menus ( name ) )
      `
    )
    .eq("store_id", store.id)
    .gte("start_at", dayStartUTC)
    .lte("start_at", dayEndUTC)
    .order("start_at", { ascending: true });

  const rawRows = (bookings ?? []) as unknown as RawBooking[];

  /* ── 顧客プロフィールを service_role で取得（RLS バイパス） ── */
  const userIds = [...new Set(rawRows.map((b) => b.user_id))];
  let profileMap = new Map<string, { full_name: string | null; email: string | null }>();

  if (userIds.length > 0) {
    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: profiles } = await adminDb
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]),
    );
  }

  /* ── セットアップ警告チェック ── */
  const setupWarnings: string[] = [];
  const resendKey = process.env.RESEND_API_KEY ?? "";
  if (!resendKey || resendKey === "your-resend-api-key") {
    setupWarnings.push("メール送信が未設定です（RESEND_API_KEY）。顧客への確認メール・リマインドが送信されません。");
  }
  const cronSecret = process.env.CRON_SECRET ?? "";
  if (!cronSecret || cronSecret === "your-cron-secret") {
    setupWarnings.push("リマインドバッチが未設定です（CRON_SECRET）。前日リマインドメールが送信されません。");
  }

  const rows: DashboardBooking[] = rawRows.map((b) => {
    const profile = profileMap.get(b.user_id);
    return {
      ...b,
      customer_name: profile?.full_name || profile?.email || "ゲスト",
    };
  });
  const reservedCount = rows.filter((b) => b.status === "reserved").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <header className="mb-8 border-b border-greige-light pb-6">
        <p className="text-xs font-semibold tracking-widest text-gold uppercase">
          {store.name}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-wider text-charcoal">
          ダッシュボード
        </h1>
      </header>

      {/* ── セットアップ警告バナー ── */}
      {setupWarnings.length > 0 && (
        <div className="mb-6 space-y-2">
          {setupWarnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              <span className="mt-0.5 shrink-0 font-bold">⚠</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard label="本日の予約" value={String(rows.length)} unit="件" />
        <SummaryCard label="確定中" value={String(reservedCount)} unit="件" accent />
        <SummaryCard label="日付" value={today.replace(/-/g, "/")} className="col-span-2 sm:col-span-1" />
      </div>

      {/* ── Today's Bookings ── */}
      <section>
        <h2 className="mb-4 text-sm font-bold tracking-wider text-charcoal uppercase">
          本日の予約一覧
        </h2>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-greige-light bg-white px-6 py-12 text-center">
            <p className="text-sm text-greige">本日の予約はありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((booking) => {
              const menuNames = booking.booking_menus
                .map((bm) => bm.menus?.name)
                .filter(Boolean)
                .join("、");
              const st = STATUS_STYLE[booking.status] ?? STATUS_STYLE.reserved;
              const customerName = booking.customer_name;

              return (
                <div
                  key={booking.id}
                  className="rounded-xl border border-greige-light bg-white p-5 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Time + Customer */}
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black tracking-wide text-charcoal">
                        {formatTime(booking.start_at)}
                        <span className="mx-1.5 text-greige">&ndash;</span>
                        {formatTime(booking.end_at)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-charcoal-light">
                        {customerName}
                      </p>
                    </div>
                    {/* Status badge */}
                    <span
                      className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-bold ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-ivory-dark pt-3 text-xs text-slate">
                    {booking.staffs && (
                      <span>
                        <span className="text-greige">担当:</span>{" "}
                        {booking.staffs.name}
                      </span>
                    )}
                    {menuNames && (
                      <span>
                        <span className="text-greige">メニュー:</span>{" "}
                        {menuNames}
                      </span>
                    )}
                    <span>
                      <span className="text-greige">所要:</span>{" "}
                      {booking.total_duration}分
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="mt-12 border-t border-greige-light pt-4 text-center text-xs text-greige">
        Powered by Yoyaku
      </footer>
    </div>
  );
}

/* ── Summary Card Component ── */
function SummaryCard({
  label,
  value,
  unit,
  accent,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-greige-light bg-white p-4 ${className ?? ""}`}
    >
      <p className="text-xs font-semibold tracking-wider text-greige uppercase">
        {label}
      </p>
      <p className="mt-1">
        <span
          className={`text-2xl font-black ${accent ? "text-gold" : "text-charcoal"}`}
        >
          {value}
        </span>
        {unit && (
          <span className="ml-1 text-sm text-slate">{unit}</span>
        )}
      </p>
    </div>
  );
}
