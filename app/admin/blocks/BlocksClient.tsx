"use client";

import { useState, useEffect, useCallback } from "react";
import type { Staff } from "@/lib/types";

/* ── 型定義 ── */
interface ShiftBlock {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  type: string;
}

/* ── JST ユーティリティ ── */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toJST(utcStr: string): Date {
  return new Date(new Date(utcStr).getTime() + JST_OFFSET_MS);
}

function formatJSTDateTime(utcStr: string): string {
  const jst = toJST(utcStr);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const min = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${h}:${min}`;
}

/** JST の日付文字列 "2026-02-17" と時刻 "09:00" → UTC ISO 文字列 */
function jstToUTC(dateStr: string, timeStr: string): string {
  const jstISO = `${dateStr}T${timeStr}:00+09:00`;
  return new Date(jstISO).toISOString();
}

/** 今日の JST 日付を YYYY-MM-DD で返す */
function todayJST(): string {
  const now = new Date(Date.now() + JST_OFFSET_MS);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ── 時刻選択肢の生成 (08:00 〜 22:00, 30分刻み) ── */
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 8; h <= 22; h++) {
    options.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 22) options.push(`${String(h).padStart(2, "0")}:30`);
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

/* ── Props ── */
interface BlocksClientProps {
  storeId: string;
  storeName: string;
  staffs: Staff[];
}

export default function BlocksClient({ storeId, storeName, staffs }: BlocksClientProps) {
  const [selectedStaffId, setSelectedStaffId] = useState(staffs[0]?.id ?? "");
  const [blocks, setBlocks] = useState<ShiftBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [date, setDate] = useState(todayJST());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);

  /* ── ブロック一覧取得 ── */
  const fetchBlocks = useCallback(async () => {
    if (!selectedStaffId) return;
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const res = await fetch(
        `/api/admin/shifts?store_id=${storeId}&staff_id=${selectedStaffId}&start=${now}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "取得に失敗しました");
      const filtered = (json.shifts as ShiftBlock[]).filter(
        (s) => s.type === "break" || s.type === "holiday"
      );
      setBlocks(filtered);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [storeId, selectedStaffId]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  /* ── ブロック追加 ── */
  const handleAdd = async () => {
    if (!selectedStaffId) return;
    setSubmitting(true);
    setError(null);
    try {
      const startAt = jstToUTC(date, startTime);
      const endAt = jstToUTC(date, endTime);
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          staff_id: selectedStaffId,
          start_at: startAt,
          end_at: endAt,
          type: "holiday",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "追加に失敗しました");
      await fetchBlocks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── ブロック削除 ── */
  const handleDelete = async (id: string) => {
    if (!confirm("このブロックを削除しますか？")) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/shifts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, store_id: storeId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "削除に失敗しました");
      await fetchBlocks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <p className="text-xs text-slate tracking-wide">{storeName}</p>
        <h1 className="text-xl font-bold text-charcoal tracking-tight">
          シフトブロック
        </h1>
      </div>

      {/* スタッフ選択 */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-slate mb-1">
          スタッフ
        </label>
        <select
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          className="w-full rounded-lg border border-greige-light bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/40"
        >
          {staffs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* ブロック追加フォーム */}
      <div className="mb-8 rounded-xl border border-greige-light bg-white p-4">
        <h2 className="text-sm font-semibold text-charcoal mb-3">
          ブロック追加
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-slate mb-1">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={todayJST()}
              className="w-full rounded-lg border border-greige-light px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="block text-xs text-slate mb-1">開始</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-greige-light px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate mb-1">終了</label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-greige-light px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={submitting || !selectedStaffId}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark transition-colors disabled:opacity-50"
          >
            {submitting ? "追加中..." : "追加"}
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ブロック一覧 */}
      <div>
        <h2 className="text-sm font-semibold text-charcoal mb-3">
          登録済みブロック
        </h2>
        {loading ? (
          <p className="text-sm text-slate">読み込み中...</p>
        ) : blocks.length === 0 ? (
          <p className="text-sm text-slate">ブロックはありません</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((block) => (
              <li
                key={block.id}
                className="flex items-center justify-between rounded-lg border border-greige-light bg-white px-4 py-3"
              >
                <div className="text-sm text-charcoal">
                  <span className="font-medium">
                    {formatJSTDateTime(block.start_at)}
                  </span>
                  <span className="mx-2 text-slate">〜</span>
                  <span className="font-medium">
                    {formatJSTDateTime(block.end_at)}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(block.id)}
                  className="shrink-0 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
