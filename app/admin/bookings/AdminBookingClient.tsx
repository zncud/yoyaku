"use client";

import { useState, useEffect, useRef } from "react";
import type { Staff, Menu } from "@/lib/types";

const INPUT_CLASS =
  "w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5 text-sm " +
  "text-charcoal placeholder:text-greige " +
  "transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30";

interface ProfileResult {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export default function AdminBookingClient({
  storeId,
  storeName,
  staffs,
  menus,
}: {
  storeId: string;
  storeName: string;
  staffs: Staff[];
  menus: Menu[];
}) {
  // 担当者
  const [staffId, setStaffId] = useState(staffs.length === 1 ? staffs[0].id : "");

  // 顧客モード
  const [customerMode, setCustomerMode] = useState<"search" | "guest">("search");

  // 検索モード
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileResult | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ゲストモード
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // メニュー
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<string>>(new Set());

  // 日時
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");

  // 送信状態
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 合計時間
  const totalDuration = menus
    .filter((m) => selectedMenuIds.has(m.id))
    .reduce((sum, m) => sum + m.duration_minutes, 0);

  // ユーザー検索 debounce
  useEffect(() => {
    if (customerMode !== "search" || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/profiles?store_id=${storeId}&q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.profiles ?? []);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, customerMode, storeId]);

  // メニュー toggle
  const toggleMenu = (menuId: string) => {
    setSelectedMenuIds((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) next.delete(menuId);
      else next.add(menuId);
      return next;
    });
  };

  // 時刻スロット生成 (8:00〜21:30, 30分刻み)
  const timeSlots: string[] = [];
  for (let h = 8; h < 22; h++) {
    timeSlots.push(`${String(h).padStart(2, "0")}:00`);
    timeSlots.push(`${String(h).padStart(2, "0")}:30`);
  }

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // フォームリセット
  const resetForm = () => {
    setStaffId(staffs.length === 1 ? staffs[0].id : "");
    setCustomerMode("search");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setSelectedMenuIds(new Set());
    setDate("");
    setSlot("");
  };

  // 送信
  const handleSubmit = async () => {
    if (!staffId) { showMessage("error", "担当者を選択してください"); return; }
    if (selectedMenuIds.size === 0) { showMessage("error", "メニューを選択してください"); return; }
    if (!date) { showMessage("error", "日付を選択してください"); return; }
    if (!slot) { showMessage("error", "時刻を選択してください"); return; }

    if (customerMode === "search" && !selectedUser) {
      showMessage("error", "顧客を選択してください");
      return;
    }
    if (customerMode === "guest" && (!guestName.trim() || !guestEmail.trim())) {
      showMessage("error", "ゲストの名前とメールアドレスは必須です");
      return;
    }

    setSubmitting(true);

    const payload: Record<string, unknown> = {
      store_id: storeId,
      staff_id: staffId,
      menu_ids: Array.from(selectedMenuIds),
      date,
      slot,
      total_duration: totalDuration,
    };

    if (customerMode === "search" && selectedUser) {
      payload.user_id = selectedUser.id;
    } else if (customerMode === "guest") {
      payload.guest = {
        name: guestName.trim(),
        email: guestEmail.trim(),
        phone: guestPhone.trim(),
      };
    }

    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage("error", data.error || "予約の作成に失敗しました");
      } else {
        showMessage("success", "予約を作成しました");
        resetForm();
      }
    } catch {
      showMessage("error", "通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* ヘッダー */}
      <header className="mb-8 border-b border-greige-light pb-6">
        <p className="text-xs font-semibold tracking-widest text-gold uppercase">
          {storeName}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-wider text-charcoal">
          予約作成
        </h1>
      </header>

      {/* メッセージ */}
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

      <div className="space-y-6">
        {/* 担当者選択 */}
        <Section title="担当者">
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">選択してください</option>
            {staffs.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Section>

        {/* 顧客選択 */}
        <Section title="顧客">
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => { setCustomerMode("search"); setSelectedUser(null); }}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                customerMode === "search"
                  ? "bg-gold text-white shadow-md"
                  : "border border-greige-light text-slate hover:bg-ivory-dark"
              }`}
            >
              会員検索
            </button>
            <button
              type="button"
              onClick={() => { setCustomerMode("guest"); setSelectedUser(null); }}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                customerMode === "guest"
                  ? "bg-gold text-white shadow-md"
                  : "border border-greige-light text-slate hover:bg-ivory-dark"
              }`}
            >
              その他（未登録者）
            </button>
          </div>

          {customerMode === "search" ? (
            <div>
              {selectedUser ? (
                <div className="flex items-center justify-between rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-charcoal">{selectedUser.full_name || "名前なし"}</p>
                    <p className="text-xs text-slate">{selectedUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setSearchQuery(""); }}
                    className="text-xs text-red-400 hover:text-red-500"
                  >
                    変更
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="氏名で検索..."
                    className={INPUT_CLASS}
                  />
                  {searching && (
                    <p className="mt-2 text-xs text-slate">検索中...</p>
                  )}
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-greige-light bg-white">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(p);
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                          className="flex w-full items-center gap-3 border-b border-greige-light/50 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-ivory-dark"
                        >
                          <div>
                            <p className="text-sm font-medium text-charcoal">{p.full_name || "名前なし"}</p>
                            <p className="text-xs text-slate">{p.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {!searching && searchQuery.trim() && searchResults.length === 0 && (
                    <p className="mt-2 text-xs text-greige">該当するユーザーが見つかりません</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold tracking-wider text-greige uppercase">
                  名前 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="山田太郎"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold tracking-wider text-greige uppercase">
                  メールアドレス <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="example@email.com"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold tracking-wider text-greige uppercase">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="090-1234-5678"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}
        </Section>

        {/* メニュー選択 */}
        <Section title="メニュー">
          <div className="space-y-2">
            {menus.map((menu) => {
              const checked = selectedMenuIds.has(menu.id);
              return (
                <label
                  key={menu.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                    checked
                      ? "border-gold/40 bg-gold/5"
                      : "border-greige-light hover:border-greige"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMenu(menu.id)}
                    className="h-4 w-4 rounded border-greige text-gold focus:ring-gold/30"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal">{menu.name}</p>
                  </div>
                  <span className="text-xs font-medium text-slate">
                    {menu.duration_minutes}分
                  </span>
                </label>
              );
            })}
          </div>
          {totalDuration > 0 && (
            <p className="mt-3 text-sm font-bold text-gold-dark">
              合計: {totalDuration}分
            </p>
          )}
        </Section>

        {/* 日時選択 */}
        <Section title="日時">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-greige uppercase">
                日付
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-greige uppercase">
                時刻
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">選択してください</option>
                {timeSlots.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>
      </div>

      {/* 送信ボタン */}
      <div className="mt-8 flex justify-end border-t border-greige-light pt-6">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-gold px-8 py-3 text-sm font-bold text-white shadow-md shadow-gold/20 transition-all hover:bg-gold-light active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              作成中...
            </span>
          ) : (
            "予約する"
          )}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-greige-light bg-white p-6">
      <h2 className="mb-4 text-sm font-bold tracking-wider text-charcoal uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
