"use client";

import { useState } from "react";

/* ── 型 ── */
interface StoreData {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  hero_image_url: string | null;
}

interface SiteSettingsData {
  theme_color: { primary: string };
  booking_interval_minutes: number;
  booking_months_ahead: number;
  min_advance_days: number;
}

/* ── プリセットカラー ── */
const COLOR_PRESETS = [
  { label: "ゴールド", value: "#c4a265" },
  { label: "ローズ", value: "#c2727f" },
  { label: "セージ", value: "#7a9a7e" },
  { label: "スカイ", value: "#5b8fb9" },
  { label: "ラベンダー", value: "#8b7bb5" },
  { label: "コーラル", value: "#d48a6e" },
  { label: "チャコール", value: "#4a4a4a" },
  { label: "ネイビー", value: "#3d4f6f" },
];

const INPUT_CLASS =
  "w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5 text-sm " +
  "text-charcoal placeholder:text-greige " +
  "transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30";

/* ── コンポーネント ── */
export default function SettingsClient({
  initialStore,
  initialSettings,
}: {
  initialStore: StoreData;
  initialSettings: SiteSettingsData;
}) {
  const [store, setStore] = useState(initialStore);
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    if (!store.name.trim()) {
      showMessage("error", "店舗名は必須です");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id,
          name: store.name,
          phone: store.phone,
          address: store.address,
          description: store.description,
          hero_image_url: store.hero_image_url,
          theme_color: settings.theme_color,
          booking_interval_minutes: settings.booking_interval_minutes,
          booking_months_ahead: settings.booking_months_ahead,
          min_advance_days: settings.min_advance_days,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage("error", data.error || "保存に失敗しました");
        return;
      }

      showMessage("success", "設定を保存しました。予約ページに即時反映されます。");
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
          {store.name}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-wider text-charcoal">
          店舗設定
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
        {/* ── 基本情報 ── */}
        <Section title="基本情報">
          <div className="space-y-4">
            <Field label="店舗名" required>
              <input
                type="text"
                value={store.name}
                onChange={(e) => setStore({ ...store, name: e.target.value })}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="スラッグ">
              <div className="flex items-center gap-2">
                <span className="text-xs text-greige">/</span>
                <input
                  type="text"
                  value={store.slug}
                  disabled
                  className={INPUT_CLASS + " bg-gray-50 text-gray-400 cursor-not-allowed"}
                />
              </div>
              <p className="mt-1 text-[10px] text-greige">
                予約ページURL: /{store.slug}/book （変更不可）
              </p>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="電話番号">
                <input
                  type="tel"
                  value={store.phone ?? ""}
                  onChange={(e) => setStore({ ...store, phone: e.target.value })}
                  placeholder="03-1234-5678"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="予約間隔">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={120}
                    step={5}
                    value={settings.booking_interval_minutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        booking_interval_minutes: parseInt(e.target.value) || 30,
                      })
                    }
                    className={INPUT_CLASS + " max-w-[100px]"}
                  />
                  <span className="text-sm text-slate">分</span>
                </div>
              </Field>
              <Field label="予約公開月数">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={settings.booking_months_ahead}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        booking_months_ahead: parseInt(e.target.value) || 3,
                      })
                    }
                    className={INPUT_CLASS + " max-w-[100px]"}
                  />
                  <span className="text-sm text-slate">ヶ月先まで</span>
                </div>
              </Field>
              <Field label="予約受付日数">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={settings.min_advance_days}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        min_advance_days: parseInt(e.target.value) || 0,
                      })
                    }
                    className={INPUT_CLASS + " max-w-[100px]"}
                  />
                  <span className="text-sm text-slate">日前まで</span>
                </div>
                <p className="mt-1 text-[10px] text-greige">
                  0の場合は当日予約可
                </p>
              </Field>
            </div>
            <Field label="住所">
              <input
                type="text"
                value={store.address ?? ""}
                onChange={(e) => setStore({ ...store, address: e.target.value })}
                placeholder="東京都渋谷区..."
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="説明">
              <textarea
                value={store.description ?? ""}
                onChange={(e) => setStore({ ...store, description: e.target.value })}
                placeholder="店舗の紹介文"
                rows={3}
                className={INPUT_CLASS + " resize-none"}
              />
            </Field>
          </div>
        </Section>

        {/* ── デザイン設定 ── */}
        <Section title="デザイン">
          {/* テーマカラー */}
          <div className="space-y-4">
            <Field label="テーマカラー">
              <div className="flex flex-wrap gap-2 mb-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        theme_color: { primary: preset.value },
                      })
                    }
                    className={`group relative h-10 w-10 rounded-full border-2 transition-all ${
                      settings.theme_color.primary === preset.value
                        ? "border-charcoal scale-110 shadow-md"
                        : "border-transparent hover:border-greige hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  >
                    {settings.theme_color.primary === preset.value && (
                      <svg
                        className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.theme_color.primary}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      theme_color: { primary: e.target.value },
                    })
                  }
                  className="h-10 w-10 cursor-pointer rounded-lg border border-greige-light bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={settings.theme_color.primary}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      theme_color: { primary: e.target.value },
                    })
                  }
                  placeholder="#c4a265"
                  className={INPUT_CLASS + " max-w-[140px] font-mono"}
                />
                <span className="text-xs text-greige">カスタムカラー</span>
              </div>
            </Field>

            {/* プレビュー */}
            <div className="rounded-xl border border-greige-light bg-ivory p-4">
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-greige uppercase">
                プレビュー
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md"
                  style={{ backgroundColor: settings.theme_color.primary }}
                >
                  A
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: settings.theme_color.primary }}>
                    {store.name}
                  </p>
                  <p className="text-xs text-greige">予約ページのアクセントカラー</p>
                </div>
                <div className="ml-auto">
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-xs font-bold text-white shadow-md transition-all"
                    style={{ backgroundColor: settings.theme_color.primary }}
                  >
                    ボタン例
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 画像設定 */}
          <div className="mt-6 space-y-6">
            <ImageUploadField
              label="ヒーロー画像"
              description="店舗トップページ上部に表示される横長の画像です（例: 1200x400px）"
              value={store.hero_image_url}
              onChange={(url) => setStore({ ...store, hero_image_url: url })}
              storeId={store.id}
              imageType="hero"
              previewClass="h-32 w-full rounded-lg object-cover"
            />
          </div>
        </Section>
      </div>

      {/* ── 保存ボタン ── */}
      <div className="mt-10 flex justify-end border-t border-greige-light pt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-gold px-8 py-3 text-sm font-bold text-white shadow-md shadow-gold/20 transition-all hover:bg-gold-light active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              保存中...
            </span>
          ) : (
            "設定を保存"
          )}
        </button>
      </div>
    </div>
  );
}

/* ── 共通コンポーネント ── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-greige-light bg-white p-6">
      <h2 className="mb-5 text-sm font-bold tracking-wider text-charcoal uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function ImageUploadField({
  label,
  description,
  value,
  onChange,
  storeId,
  imageType,
  previewClass,
}: {
  label: string;
  description: string;
  value: string | null;
  onChange: (url: string) => void;
  storeId: string;
  imageType: string;
  previewClass: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("store_id", storeId);
    formData.append("type", imageType);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "アップロードに失敗しました");
      } else {
        onChange(data.url);
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setUploading(false);
      // input をリセット
      e.target.value = "";
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
        {label}
      </label>
      <p className="mb-3 text-[11px] text-slate">{description}</p>

      {/* プレビュー */}
      {value && (
        <div className="mb-3 overflow-hidden rounded-lg border border-greige-light bg-ivory-dark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label}プレビュー`}
            className={previewClass}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* アップロードボタン + URL入力 */}
      <div className="flex items-center gap-2">
        <label
          className={`shrink-0 cursor-pointer rounded-lg border border-greige-light px-4 py-2.5 text-xs font-medium text-slate transition-colors hover:bg-ivory-dark ${
            uploading ? "opacity-50 cursor-wait" : ""
          }`}
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              アップロード中…
            </span>
          ) : (
            "ファイルを選択"
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <input
          type="url"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="または画像URLを直接入力"
          className={INPUT_CLASS + " text-xs"}
        />
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-2 text-[11px] text-red-400 hover:text-red-500 transition-colors"
        >
          画像を削除
        </button>
      )}
    </div>
  );
}
