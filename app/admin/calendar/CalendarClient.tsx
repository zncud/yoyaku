"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Staff } from "@/lib/types";

/* ── 定数 ── */
const GRID_START_HOUR = 8;
const GRID_END_HOUR = 22;
const SLOT_HEIGHT = 48;
const TOTAL_SLOTS = (GRID_END_HOUR - GRID_START_HOUR) * 2;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  reserved:  { label: "確定",       bg: "bg-gold/20",       text: "text-gold-dark" },
  completed: { label: "完了",       bg: "bg-emerald-100",   text: "text-emerald-700" },
  cancelled: { label: "キャンセル", bg: "bg-gray-100",      text: "text-gray-400" },
};

/* ── 型定義 ── */
interface CalendarBooking {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  total_duration: number;
  status: string;
  guest_name: string | null;
  guest_email: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
  staffs: { name: string } | null;
  booking_menus: Array<{ menus: { name: string } | null }>;
}

interface CalendarShift {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  type: string;
}

/* ── ユーティリティ ── */
function toJST(utcStr: string): Date {
  return new Date(new Date(utcStr).getTime() + JST_OFFSET_MS);
}

function formatJSTDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatJSTTime(utcStr: string): string {
  const jst = toJST(utcStr);
  return `${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function calcBlockStyle(startUtc: string, endUtc: string) {
  const startJST = toJST(startUtc);
  const endJST = toJST(endUtc);
  const startMin = startJST.getUTCHours() * 60 + startJST.getUTCMinutes();
  const endMin = endJST.getUTCHours() * 60 + endJST.getUTCMinutes();
  const gridStartMin = GRID_START_HOUR * 60;

  const top = ((startMin - gridStartMin) / 30) * SLOT_HEIGHT;
  const height = Math.max(((endMin - startMin) / 30) * SLOT_HEIGHT, SLOT_HEIGHT * 0.5);

  return { top, height };
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDisplayDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dow = DAY_LABELS[date.getDay()];
  return `${y}/${m}/${d}（${dow}）`;
}

/* ── カレンダーポップアップ ── */
function CalendarPopup({
  selectedDate,
  onSelect,
  onClose,
}: {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const days = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const startDow = days[0].getDay();
  const monthLabel = `${viewYear}年${viewMonth + 1}月`;

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-xs overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={handlePrev}
            className="rounded-lg p-1.5 text-charcoal transition-colors hover:bg-ivory-dark"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-sm font-bold tracking-wider text-charcoal">{monthLabel}</p>
          <button
            onClick={handleNext}
            className="rounded-lg p-1.5 text-charcoal transition-colors hover:bg-ivory-dark"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_LABELS.map((w, i) => (
            <div
              key={w}
              className={`py-1 text-center text-xs font-semibold ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dow = day.getDay();
            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  onSelect(day);
                  onClose();
                }}
                className={`
                  relative flex h-9 items-center justify-center rounded-lg text-sm
                  font-medium transition-all
                  ${isSelected
                    ? "bg-gold font-black text-white shadow-md shadow-gold/20"
                    : "text-charcoal-light hover:bg-ivory-dark"
                  }
                  ${!isSelected && dow === 0 ? "text-red-400" : ""}
                  ${!isSelected && dow === 6 ? "text-blue-400" : ""}
                `}
              >
                {day.getDate()}
                {isToday && !isSelected && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-gold" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── メインコンポーネント ── */
export default function CalendarClient({
  storeId,
  storeName,
  staffs,
}: {
  storeId: string;
  storeName: string;
  staffs: Staff[];
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffs[0]?.id ?? "");
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [shifts, setShifts] = useState<CalendarShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const selectedDateStr = formatJSTDate(selectedDate);

  /* ── データ取得 ── */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const dateStr = formatJSTDate(selectedDate);

    try {
      const res = await fetch(
        `/api/admin/calendar?store_id=${storeId}&start=${dateStr}&end=${dateStr}`
      );
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
        setShifts(data.shifts);
      }
    } catch {
      // 通信エラーは静かに処理
    } finally {
      setIsLoading(false);
    }
  }, [storeId, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── 日付ナビゲーション ── */
  const goToPrevDay = () => setSelectedDate((prev) => addDays(prev, -1));
  const goToNextDay = () => setSelectedDate((prev) => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  /* ── 選択スタッフのデータをフィルタ ── */
  const staffBookings = bookings.filter((b) => {
    const jst = toJST(b.start_at);
    return (
      formatJSTDate(jst) === selectedDateStr &&
      b.staff_id === selectedStaffId &&
      b.status !== "cancelled"
    );
  });

  const staffShifts = shifts.filter((s) => {
    const jst = toJST(s.start_at);
    return formatJSTDate(jst) === selectedDateStr && s.staff_id === selectedStaffId;
  });

  const isWorking = staffShifts.some((s) => s.type === "work");
  const staffBreaks = staffShifts.filter(
    (s) => s.type === "break" || s.type === "holiday"
  );

  /* ── 時間ラベル生成 ── */
  const timeLabels: string[] = [];
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
    timeLabels.push(`${String(h).padStart(2, "0")}:00`);
    timeLabels.push(`${String(h).padStart(2, "0")}:30`);
  }

  const selectedStaff = staffs.find((s) => s.id === selectedStaffId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* ── ヘッダー ── */}
      <header className="mb-6 border-b border-greige-light pb-6">
        <p className="text-xs font-semibold tracking-widest text-gold uppercase">
          {storeName}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-wider text-charcoal">
          予約台帳
        </h1>
      </header>

      {/* ── フィルター: 日付 + スタッフ ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* 日付選択 */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevDay}
            className="rounded-lg border border-greige-light p-2 text-slate transition-colors hover:bg-ivory-dark"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-2 rounded-lg border border-greige-light bg-white px-4 py-2 text-sm font-bold text-charcoal transition-colors hover:bg-ivory-dark"
          >
            <svg className="h-4 w-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {formatDisplayDate(selectedDate)}
          </button>

          <button
            onClick={goToNextDay}
            className="rounded-lg border border-greige-light p-2 text-slate transition-colors hover:bg-ivory-dark"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <button
            onClick={goToToday}
            className="ml-1 rounded-lg border border-greige-light px-3 py-2 text-xs font-medium text-slate transition-colors hover:bg-ivory-dark"
          >
            今日
          </button>
        </div>

        {/* スタッフ選択 */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold tracking-wider text-greige uppercase">
            担当者
          </label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="rounded-lg border border-greige-light bg-white px-4 py-2 text-sm font-bold text-charcoal transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
          >
            {staffs.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── ローディング ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-8 w-8 animate-spin text-gold" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : staffs.length === 0 ? (
        <div className="rounded-2xl border border-greige-light bg-white px-6 py-16 text-center">
          <p className="text-sm text-greige">アクティブなスタッフがいません</p>
        </div>
      ) : (
        /* ── タイムグリッド（1スタッフ分） ── */
        <div className="rounded-xl border border-greige-light bg-white overflow-hidden">
          {/* スタッフヘッダー */}
          <div className="flex items-center gap-3 border-b border-greige-light bg-ivory/50 px-5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-sm font-black text-gold-dark">
              {selectedStaff?.name.charAt(0) ?? "?"}
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">{selectedStaff?.name}</p>
              <p className="text-[10px] text-greige">
                {staffBookings.length > 0 && `予約 ${staffBookings.length}件`}
              </p>
            </div>
          </div>

          {/* グリッド本体 */}
          <div className="flex">
            {/* 時間ラベル列 */}
            <div className="w-14 shrink-0 border-r border-greige-light">
              {timeLabels.map((label, idx) => (
                <div
                  key={label}
                  className="flex items-start justify-end pr-2 pt-0.5"
                  style={{ height: SLOT_HEIGHT }}
                >
                  {idx % 2 === 0 && (
                    <span className="text-[10px] font-medium text-greige -mt-1.5">
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* 予約列 */}
            <div
              className="relative flex-1"
              style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
            >
              {/* グリッド線 */}
              {timeLabels.map((_, idx) => (
                <div
                  key={idx}
                  className={`absolute left-0 right-0 border-b ${
                    idx % 2 === 1 ? "border-greige-light/40" : "border-greige-light/70"
                  }`}
                  style={{ top: (idx + 1) * SLOT_HEIGHT }}
                />
              ))}

              {/* 休憩ブロック */}
              {staffBreaks.map((brk) => {
                const style = calcBlockStyle(brk.start_at, brk.end_at);
                return (
                  <div
                    key={brk.id}
                    className="absolute left-2 right-2 rounded bg-greige-light/60 border border-dashed border-greige/40"
                    style={{ top: style.top, height: style.height }}
                  >
                    <span className="block px-2 pt-1 text-[10px] font-medium text-greige">
                      予約不可
                    </span>
                  </div>
                );
              })}

              {/* 予約ブロック */}
              {staffBookings.map((booking) => {
                const style = calcBlockStyle(booking.start_at, booking.end_at);
                const st = STATUS_STYLE[booking.status] ?? STATUS_STYLE.reserved;
                const menuNames = booking.booking_menus
                  .map((bm) => bm.menus?.name)
                  .filter(Boolean)
                  .join("・");
                const customerName =
                  booking.profiles?.full_name || booking.profiles?.email || booking.guest_name || "ゲスト";

                return (
                  <button
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className={`absolute left-2 right-2 rounded-lg border border-gold/30 ${st.bg} px-3 pt-1.5 text-left transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer overflow-hidden`}
                    style={{ top: style.top, height: style.height }}
                  >
                    <p className={`text-xs font-bold ${st.text}`}>
                      {formatJSTTime(booking.start_at)} — {formatJSTTime(booking.end_at)}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-charcoal truncate">
                      {customerName}
                    </p>
                    {style.height >= SLOT_HEIGHT * 1.8 && (
                      <p className="mt-0.5 text-xs text-slate truncate">
                        {menuNames}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 凡例 ── */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-gold/20 border border-gold/30" />
          予約（確定）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-greige-light/60 border border-dashed border-greige/40" />
          休憩・ブロック
        </span>
      </div>

      {/* ── カレンダーポップアップ ── */}
      {showCalendar && (
        <CalendarPopup
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* ── 予約詳細ポップアップ ── */}
      {selectedBooking && (
        <BookingDetailPopup
          booking={selectedBooking}
          storeId={storeId}
          onClose={() => setSelectedBooking(null)}
          onCancelled={() => {
            setSelectedBooking(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

/* ── 予約詳細ポップアップ ── */
function BookingDetailPopup({
  booking,
  storeId,
  onClose,
  onCancelled,
}: {
  booking: CalendarBooking;
  storeId: string;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const st = STATUS_STYLE[booking.status] ?? STATUS_STYLE.reserved;
  const customerName =
    booking.profiles?.full_name || booking.profiles?.email || booking.guest_name || "ゲスト";
  const customerEmail = booking.profiles?.email || booking.guest_email || "—";
  const staffName = booking.staffs?.name || "—";
  const menuNames = booking.booking_menus
    .map((bm) => bm.menus?.name)
    .filter(Boolean)
    .join("、");

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId, booking_id: booking.id }),
      });
      if (res.ok) {
        onCancelled();
      } else {
        const data = await res.json();
        alert(data.error || "キャンセルに失敗しました");
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const details = [
    {
      label: "時間",
      value: `${formatJSTTime(booking.start_at)} — ${formatJSTTime(booking.end_at)}`,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "顧客",
      value: customerName,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      label: "メール",
      value: customerEmail,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      label: "担当",
      value: staffName,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
    },
    {
      label: "メニュー",
      value: menuNames || "—",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
    },
    {
      label: "所要時間",
      value: `${booking.total_duration}分`,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black tracking-wider text-charcoal">
              予約詳細
            </h2>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-bold border ${
                booking.status === "reserved"
                  ? "bg-gold/15 text-gold-dark border-gold/30"
                  : booking.status === "completed"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-100 text-gray-400 border-gray-200"
              }`}
            >
              {st.label}
            </span>
          </div>

          <div className="divide-y divide-ivory-dark">
            {details.map((item) => (
              <div key={item.label} className="flex items-start gap-3 py-3">
                <div className="mt-0.5 text-gold">{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold tracking-wider text-greige uppercase">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-charcoal break-all">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            {booking.status === "reserved" && !confirmCancel && (
              <button
                onClick={() => setConfirmCancel(true)}
                className="w-full rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              >
                この予約をキャンセル
              </button>
            )}
            {confirmCancel && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="mb-3 text-sm font-medium text-red-700">
                  本当にキャンセルしますか？顧客にキャンセル通知メールが送信されます。
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelling ? "処理中..." : "キャンセル実行"}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 rounded-lg border border-greige-light py-2 text-sm font-medium text-slate transition-colors hover:bg-ivory-dark"
                  >
                    戻る
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-greige-light py-2.5 text-sm font-medium text-slate transition-colors hover:bg-ivory-dark"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
