"use client";

import { useState, useEffect, useMemo } from "react";
import { useBooking, useBookingDispatch } from "../_context/BookingContext";
import { createClient } from "@/lib/supabase/client";

/* ── Helpers ── */
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

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dow = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${y}/${m}/${d}（${dow}）`;
}

/** Date → "YYYY-MM-DD" (ブラウザのローカルタイム = JST 想定) */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/* ── Calendar Component ── */
function MiniCalendar({
  selectedDate,
  onSelect,
  viewYear,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  availableDates,
  loadingDates,
  maxDate,
  minDate,
}: {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  viewYear: number;
  viewMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  availableDates: Set<string>;
  loadingDates: boolean;
  maxDate: Date;
  minDate: Date;
}) {
  const today = new Date();
  const days = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const startDow = days[0].getDay();

  const monthLabel = `${viewYear}年${viewMonth + 1}月`;

  // minDate より前の月に遷移できないようにする
  const canGoPrev =
    viewYear > minDate.getFullYear() ||
    (viewYear === minDate.getFullYear() && viewMonth > minDate.getMonth());

  // 最大月を超えて遷移できないようにする
  const canGoNext =
    viewYear < maxDate.getFullYear() ||
    (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth());

  return (
    <div>
      {/* Month Navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={onPrevMonth}
          disabled={!canGoPrev}
          className={`rounded-lg p-1.5 transition-colors ${
            canGoPrev
              ? "text-charcoal hover:bg-ivory-dark"
              : "cursor-not-allowed text-greige-light"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-sm font-bold tracking-wider text-charcoal">
          {monthLabel}
        </p>
        <button
          onClick={onNextMonth}
          disabled={!canGoNext}
          className={`rounded-lg p-1.5 transition-colors ${
            canGoNext
              ? "text-charcoal hover:bg-ivory-dark"
              : "cursor-not-allowed text-greige-light"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday header */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`
              py-1 text-center text-xs font-semibold
              ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate"}
            `}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className={`grid grid-cols-7 gap-1${loadingDates ? " opacity-50" : ""}`}>
        {/* Empty cells for offset */}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day) => {
          const isPast = day < minDate && !isSameDay(day, minDate);
          const isBeyondMax = day > maxDate;
          const dateStr = toDateString(day);
          const isAvailable = availableDates.has(dateStr);
          const isUnavailable = isPast || isBeyondMax || (!loadingDates && !isAvailable);

          if (isUnavailable) {
            return <div key={day.toISOString()} />;
          }

          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const dow = day.getDay();

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={`
                relative flex h-10 items-center justify-center rounded-lg text-sm
                font-medium transition-all duration-150
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
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Time Slot Grid ── */
function TimeSlotGrid({
  slots,
  loading,
  selectedSlot,
  onSelect,
}: {
  slots: string[];
  loading: boolean;
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
        <span className="ml-3 text-sm text-slate">空き時間を取得中…</span>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-greige">
        この日は空きがありません
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-bold tracking-wider text-charcoal">
        空き時間
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {slots.map((slot) => {
          const isSelected = slot === selectedSlot;
          return (
            <button
              key={slot}
              onClick={() => onSelect(slot)}
              className={`
                rounded-lg border py-2.5 text-center text-sm font-semibold
                tracking-wide transition-all duration-150
                ${isSelected
                  ? "border-gold bg-gold text-white shadow-md shadow-gold/20"
                  : "border-greige-light text-charcoal-light hover:border-gold/40 hover:text-gold-dark"
                }
              `}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Step ── */
export default function StepDatetime() {
  const { booking, storeData } = useBooking();
  const dispatch = useBookingDispatch();
  const bookingMonthsAhead = storeData.bookingMonthsAhead;
  const minAdvanceDays = storeData.minAdvanceDays;

  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // カレンダーの表示月
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // 予約可能な日付 (YYYY-MM-DD)
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [loadingDates, setLoadingDates] = useState(true);

  // 月が変わった or スタッフが変わったらシフトを取得
  useEffect(() => {
    let cancelled = false;

    async function fetchShiftDates() {
      setLoadingDates(true);
      const supabase = createClient();

      // 営業時間を取得
      const { data: hoursData } = await supabase
        .from("store_hours")
        .select("day_of_week, is_open")
        .eq("store_id", booking.storeId);

      if (cancelled) return;

      // is_open な曜日の Set を作成
      const openDays = new Set<number>();
      for (const h of hoursData ?? []) {
        if (h.is_open) openDays.add(h.day_of_week);
      }

      // 表示月の全日付をループし、is_open な曜日の日を availableDates に追加
      const dates = new Set<string>();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(viewYear, viewMonth, d);
        if (openDays.has(date.getDay())) {
          dates.add(toDateString(date));
        }
      }

      setAvailableDates(dates);
      setLoadingDates(false);
    }

    fetchShiftDates();
    return () => { cancelled = true; };
  }, [viewYear, viewMonth, booking.storeId]);

  // シフト取得後、選択中の日付が無効になった場合はクリア
  useEffect(() => {
    if (loadingDates || !booking.selectedDate) return;
    const dateStr = toDateString(booking.selectedDate);
    if (!availableDates.has(dateStr)) {
      dispatch({ type: "SET_DATE", payload: null });
    }
  }, [availableDates, loadingDates, booking.selectedDate, dispatch]);

  // 月ナビゲーション
  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // 日付・スタッフ・施術時間が変わったら空き枠を再取得
  useEffect(() => {
    if (!booking.selectedDate || booking.totalDuration <= 0) {
      setSlots([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setSlots([]);

    const params = new URLSearchParams({
      store_id: booking.storeId,
      date: toDateString(booking.selectedDate),
      duration: String(booking.totalDuration),
    });
    if (booking.staff) {
      params.set("staff_id", booking.staff.id);
    }

    fetch(`/api/availability?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setSlots(data.slots ?? []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("空き枠の取得に失敗しました:", err);
          setSlots([]);
        }
      })
      .finally(() => {
        // abort された場合は次のリクエストが loading を管理するので触らない
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [booking.selectedDate, booking.staff, booking.totalDuration, booking.storeId]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-black tracking-wider text-charcoal uppercase">
          Date & Time
        </h2>
        <p className="mt-1 text-sm text-slate">
          ご希望の日時をお選びください
        </p>
      </div>

      <div className="space-y-8">
        {/* Calendar */}
        <div className="rounded-xl border border-greige-light bg-white p-4 shadow-sm">
          <MiniCalendar
            selectedDate={booking.selectedDate}
            onSelect={(date) => dispatch({ type: "SET_DATE", payload: date })}
            viewYear={viewYear}
            viewMonth={viewMonth}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            availableDates={availableDates}
            loadingDates={loadingDates}
            minDate={(() => {
              const d = new Date();
              d.setDate(d.getDate() + minAdvanceDays);
              return d;
            })()}
            maxDate={(() => {
              const d = new Date();
              d.setMonth(d.getMonth() + bookingMonthsAhead);
              return d;
            })()}
          />
        </div>

        {/* Time slots (日付選択後に表示) */}
        {booking.selectedDate && (
          <div className="rounded-xl border border-greige-light bg-white p-4 shadow-sm">
            <p className="mb-4 text-xs font-medium text-gold-dark">
              {formatDate(booking.selectedDate)}
            </p>
            <TimeSlotGrid
              slots={slots}
              loading={loading}
              selectedSlot={booking.selectedSlot}
              onSelect={(slot) => dispatch({ type: "SET_SLOT", payload: slot })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
