"use client";

import { useState } from "react";

/* ── 型定義 ── */
interface HourRow {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

const DAY_LABELS = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

const DEFAULT_HOURS: HourRow[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  open_time: "10:00:00",
  close_time: "20:00:00",
  is_open: i !== 0, // 日曜はデフォルト休み
}));

const INPUT_CLASS =
  "w-full rounded-lg border border-greige-light bg-ivory px-3 py-2 text-sm " +
  "text-charcoal transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30";

function timeOnly(t: string): string {
  // "10:00:00" → "10:00"
  return t.slice(0, 5);
}

/* ── メインコンポーネント ── */
export default function HoursClient({
  storeId,
  storeName,
  initialHours,
}: {
  storeId: string;
  storeName: string;
  initialHours: HourRow[];
}) {
  // 初期データがない場合はデフォルトを使用
  const [hours, setHours] = useState<HourRow[]>(
    initialHours.length === 7 ? initialHours : DEFAULT_HOURS,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  /* ── 営業時間の更新 ── */
  const updateHour = (dow: number, field: keyof HourRow, value: string | boolean) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dow ? { ...h, [field]: value } : h,
      ),
    );
  };

  const handleSaveHours = async () => {
    setIsSaving(true);
    try {
      const payload = hours.map((h) => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time.length === 5 ? h.open_time + ":00" : h.open_time,
        close_time: h.close_time.length === 5 ? h.close_time + ":00" : h.close_time,
        is_open: h.is_open,
      }));

      const res = await fetch("/api/admin/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId, hours: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        showMessage("error", data.error || "保存に失敗しました");
        return;
      }
      showMessage("success", "営業時間を保存しました");
    } catch {
      showMessage("error", "通信エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* ── ヘッダー ── */}
      <header className="mb-8 border-b border-greige-light pb-6">
        <p className="text-xs font-semibold tracking-widest text-gold uppercase">
          {storeName}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-wider text-charcoal">
          営業時間
        </h1>
      </header>

      {/* ── メッセージ ── */}
      {message && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* ── 営業時間 ── */}
        <section className="rounded-xl border border-greige-light bg-white p-6">
          <h2 className="mb-5 text-sm font-bold tracking-wider text-charcoal uppercase">
            営業時間
          </h2>
          <p className="mb-4 text-xs text-slate">
            曜日ごとの営業時間を設定します。営業時間内のみ予約を受け付けます。
          </p>

          <div className="space-y-3">
            {hours.map((h) => (
              <div
                key={h.day_of_week}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  h.is_open
                    ? "border-greige-light bg-white"
                    : "border-greige-light/60 bg-ivory-dark"
                }`}
              >
                {/* 営業/休業トグル */}
                <button
                  type="button"
                  onClick={() => updateHour(h.day_of_week, "is_open", !h.is_open)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    h.is_open ? "bg-gold" : "bg-greige-light"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      h.is_open ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>

                {/* 曜日ラベル */}
                <span
                  className={`w-16 shrink-0 text-sm font-bold ${
                    h.day_of_week === 0
                      ? "text-red-400"
                      : h.day_of_week === 6
                      ? "text-blue-400"
                      : "text-charcoal"
                  }`}
                >
                  {DAY_LABELS[h.day_of_week]}
                </span>

                {h.is_open ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={timeOnly(h.open_time)}
                      onChange={(e) => updateHour(h.day_of_week, "open_time", e.target.value)}
                      className={INPUT_CLASS + " max-w-[120px]"}
                    />
                    <span className="text-sm text-greige">〜</span>
                    <input
                      type="time"
                      value={timeOnly(h.close_time)}
                      onChange={(e) => updateHour(h.day_of_week, "close_time", e.target.value)}
                      className={INPUT_CLASS + " max-w-[120px]"}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-greige">定休日</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveHours}
              disabled={isSaving}
              className="rounded-lg bg-gold px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-gold/20 transition-all hover:bg-gold-light active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? "保存中..." : "営業時間を保存"}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
