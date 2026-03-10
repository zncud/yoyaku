"use client";

/* ── 型定義 ── */
interface BookingWithDetails {
  id: string;
  store_id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  total_duration: number;
  status: "reserved" | "cancelled" | "completed";
  created_at: string;
  staffs: { name: string; image_url: string | null } | null;
  stores: { name: string; phone: string | null } | null;
  booking_menus: Array<{
    menus: { name: string; duration_minutes: number } | null;
  }>;
}

/* ── JST フォーマット (Intl API) ── */
const jstFmt = (utc: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(utc).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", ...opts });

function formatDate(utc: string): string {
  return jstFmt(utc, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
}

function formatTime(utc: string): string {
  return jstFmt(utc, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/* ── ステータスバッジ ── */
const STATUS_MAP: Record<
  BookingWithDetails["status"],
  { label: string; className: string }
> = {
  reserved: {
    label: "確定",
    className: "bg-gold/15 text-gold-dark border border-gold/30",
  },
  completed: {
    label: "完了",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  cancelled: {
    label: "キャンセル",
    className: "bg-gray-100 text-gray-400 border border-gray-200",
  },
};

function StatusBadge({ status }: { status: BookingWithDetails["status"] }) {
  const meta = STATUS_MAP[status];
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

/* ── 予約カード ── */
function BookingCard({ booking }: { booking: BookingWithDetails }) {
  const menuNames = booking.booking_menus
    .map((bm) => bm.menus?.name)
    .filter(Boolean)
    .join("、");

  return (
    <div className="rounded-xl border border-greige-light bg-white p-5 shadow-sm">
      {/* ヘッダー: 日時 + ステータス */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-charcoal">
            {formatDate(booking.start_at)}
          </p>
          <p className="mt-0.5 text-lg font-black tracking-wide text-gold-dark">
            {formatTime(booking.start_at)}
            <span className="mx-1 text-greige">&ndash;</span>
            {formatTime(booking.end_at)}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* 詳細 */}
      <div className="space-y-1.5 border-t border-ivory-dark pt-3">
        {booking.stores && <Row label="店舗" value={booking.stores.name} />}
        {booking.staffs && <Row label="担当" value={booking.staffs.name} />}
        {menuNames && <Row label="メニュー" value={menuNames} />}
        <Row label="所要時間" value={`${booking.total_duration}分`} />
      </div>

      {/* キャンセル案内（確定中の予約のみ） */}
      {booking.status === "reserved" && (
        <div className="mt-4 rounded-lg border border-gold/15 bg-gold/5 px-4 py-3">
          <p className="text-xs leading-relaxed text-slate">
            キャンセルをご希望の場合は、お手数ですが店舗へ直接お電話ください。
          </p>
          {booking.stores?.phone && (
            <a
              href={`tel:${booking.stores.phone.replace(/-/g, "")}`}
              className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-bold text-gold-dark transition-colors hover:text-gold"
            >
              <PhoneIcon />
              {booking.stores.phone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ── ヘルパーコンポーネント ── */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-16 shrink-0 text-greige">{label}</span>
      <span className="font-medium text-charcoal-light">{value}</span>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

/* ── メインコンポーネント ── */
export default function BookingList({
  bookings,
}: {
  bookings: BookingWithDetails[];
}) {
  return (
    <section>
      <h2 className="mb-4 text-base font-black tracking-wider text-charcoal uppercase">
        Reservations
      </h2>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-greige-light bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-greige">予約履歴はまだありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </section>
  );
}
