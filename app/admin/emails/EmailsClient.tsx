"use client";

import { useState } from "react";
import type { MailTemplateConfig, MailTemplateOverride } from "@/lib/mail";
import { DEFAULT_TEMPLATES } from "@/lib/mail";

/* ── メール種別定義 ── */
const EMAIL_TYPES: {
  key: keyof MailTemplateConfig;
  label: string;
  description: string;
  hasBody: boolean;
  hasFooter: boolean;
  variables: { key: string; label: string }[];
}[] = [
  {
    key: "booking_confirmation",
    label: "予約確認メール",
    description: "お客様が予約を完了した際に送信されます",
    hasBody: true,
    hasFooter: true,
    variables: [
      { key: "storeName", label: "店舗名" },
      { key: "customerName", label: "お客様名" },
      { key: "staffName", label: "スタッフ名" },
      { key: "date", label: "日付" },
      { key: "time", label: "時間" },
      { key: "duration", label: "所要時間（分）" },
      { key: "menuNames", label: "メニュー名" },
      { key: "storePhone", label: "店舗電話番号" },
    ],
  },
  {
    key: "reminder",
    label: "リマインドメール",
    description: "予約前日にお客様へ自動送信されます",
    hasBody: true,
    hasFooter: true,
    variables: [
      { key: "storeName", label: "店舗名" },
      { key: "customerName", label: "お客様名" },
      { key: "staffName", label: "スタッフ名" },
      { key: "date", label: "日付" },
      { key: "time", label: "時間" },
      { key: "duration", label: "所要時間（分）" },
      { key: "menuNames", label: "メニュー名" },
      { key: "storePhone", label: "店舗電話番号" },
    ],
  },
  {
    key: "cancellation",
    label: "キャンセル通知メール",
    description: "予約がキャンセルされた際にお客様へ送信されます",
    hasBody: true,
    hasFooter: true,
    variables: [
      { key: "storeName", label: "店舗名" },
      { key: "customerName", label: "お客様名" },
      { key: "staffName", label: "スタッフ名" },
      { key: "date", label: "日付" },
      { key: "time", label: "時間" },
      { key: "menuNames", label: "メニュー名" },
      { key: "storePhone", label: "店舗電話番号" },
    ],
  },
  {
    key: "admin_notify",
    label: "管理者通知メール",
    description: "新規予約が入った際に管理者（あなた）へ送信されます",
    hasBody: false,
    hasFooter: false,
    variables: [
      { key: "storeName", label: "店舗名" },
      { key: "customerName", label: "お客様名" },
      { key: "customerEmail", label: "お客様メール" },
      { key: "customerPhone", label: "お客様電話番号" },
      { key: "staffName", label: "スタッフ名" },
      { key: "date", label: "日付" },
      { key: "time", label: "時間" },
      { key: "duration", label: "所要時間（分）" },
      { key: "menuNames", label: "メニュー名" },
    ],
  },
];

const INPUT_CLASS =
  "w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5 text-sm " +
  "text-charcoal placeholder:text-greige " +
  "transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30";

export default function EmailsClient({
  storeId,
  storeName,
  initialMailConfig,
}: {
  storeId: string;
  storeName: string;
  initialMailConfig: MailTemplateConfig;
}) {
  const [config, setConfig] = useState<MailTemplateConfig>(initialMailConfig);
  const [openTab, setOpenTab] = useState<keyof MailTemplateConfig>("booking_confirmation");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const getField = (key: keyof MailTemplateConfig, field: keyof MailTemplateOverride): string => {
    return config[key]?.[field] ?? "";
  };

  const setField = (key: keyof MailTemplateConfig, field: keyof MailTemplateOverride, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const resetTemplate = (key: keyof MailTemplateConfig) => {
    setConfig((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId, mail_config: config }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage("error", data.error || "保存に失敗しました");
        return;
      }
      showMessage("success", "メール設定を保存しました");
    } catch {
      showMessage("error", "通信エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  const activeType = EMAIL_TYPES.find((t) => t.key === openTab)!;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* ── ヘッダー ── */}
      <header className="mb-8 border-b border-greige-light pb-6">
        <p className="text-xs font-semibold tracking-widest text-gold uppercase">
          {storeName}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-wider text-charcoal">
          メール管理
        </h1>
        <p className="mt-2 text-sm text-slate">
          お客様に送信されるメールの件名・本文をカスタマイズできます。
          空欄の場合はデフォルトの文面が使われます。
        </p>
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

      {/* ── タブ ── */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6">
        {EMAIL_TYPES.map((type) => (
          <button
            key={type.key}
            type="button"
            onClick={() => setOpenTab(type.key)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium tracking-wide transition-colors ${
              openTab === type.key
                ? "bg-gold/10 text-gold-dark"
                : "text-slate hover:bg-ivory-dark hover:text-charcoal"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* ── エディタ ── */}
      <section className="rounded-xl border border-greige-light bg-white p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold tracking-wider text-charcoal uppercase">
              {activeType.label}
            </h2>
            <p className="mt-1 text-xs text-slate">{activeType.description}</p>
          </div>
          <button
            type="button"
            onClick={() => resetTemplate(openTab)}
            className="shrink-0 rounded-lg border border-greige-light px-3 py-1.5 text-[11px] font-medium text-slate transition-colors hover:bg-ivory-dark"
          >
            デフォルトに戻す
          </button>
        </div>

        <div className="space-y-5">
          {/* 件名 */}
          <FieldGroup label="件名">
            <input
              type="text"
              value={getField(openTab, "subject")}
              onChange={(e) => setField(openTab, "subject", e.target.value)}
              placeholder={DEFAULT_TEMPLATES[openTab].subject}
              className={INPUT_CLASS}
            />
          </FieldGroup>

          {/* 見出し */}
          <FieldGroup label="見出し">
            <input
              type="text"
              value={getField(openTab, "heading")}
              onChange={(e) => setField(openTab, "heading", e.target.value)}
              placeholder={DEFAULT_TEMPLATES[openTab].heading}
              className={INPUT_CLASS}
            />
          </FieldGroup>

          {/* 本文 */}
          {activeType.hasBody && (
            <FieldGroup label="本文">
              <textarea
                value={getField(openTab, "body")}
                onChange={(e) => setField(openTab, "body", e.target.value)}
                placeholder={DEFAULT_TEMPLATES[openTab].body}
                rows={2}
                className={INPUT_CLASS + " resize-none"}
              />
            </FieldGroup>
          )}

          {/* フッター */}
          {activeType.hasFooter && (
            <FieldGroup label="フッター">
              <textarea
                value={getField(openTab, "footer")}
                onChange={(e) => setField(openTab, "footer", e.target.value)}
                placeholder={DEFAULT_TEMPLATES[openTab].footer}
                rows={2}
                className={INPUT_CLASS + " resize-none"}
              />
            </FieldGroup>
          )}
        </div>

        {/* 変数一覧 */}
        <div className="mt-6 rounded-lg bg-ivory p-4">
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-greige uppercase">
            使用できる変数
          </p>
          <div className="flex flex-wrap gap-2">
            {activeType.variables.map((v) => (
              <span
                key={v.key}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-greige-light px-2 py-1 text-[11px]"
              >
                <code className="font-mono text-gold-dark">{`{{${v.key}}}`}</code>
                <span className="text-slate">{v.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* プレビュー */}
        <div className="mt-6 rounded-lg border border-greige-light bg-ivory p-4">
          <p className="mb-3 text-[10px] font-semibold tracking-wider text-greige uppercase">
            プレビュー
          </p>
          <PreviewCard
            typeKey={openTab}
            config={config}
            storeName={storeName}
          />
        </div>
      </section>

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
            "メール設定を保存"
          )}
        </button>
      </div>
    </div>
  );
}

/* ── フィールドグループ ── */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── プレビューカード ── */
function PreviewCard({
  typeKey,
  config,
  storeName,
}: {
  typeKey: keyof MailTemplateConfig;
  config: MailTemplateConfig;
  storeName: string;
}) {
  const defaults = DEFAULT_TEMPLATES[typeKey];
  const overrides = config[typeKey];

  const subject = overrides?.subject || defaults.subject;
  const heading = overrides?.heading || defaults.heading;
  const body = overrides?.body || defaults.body;
  const footer = overrides?.footer || defaults.footer;

  // サンプル変数
  const sampleVars: Record<string, string> = {
    storeName,
    customerName: "山田 花子",
    staffName: "佐藤",
    date: "2026/03/01",
    time: "14:00",
    duration: "90",
    menuNames: "カット、カラー",
    storePhone: "03-1234-5678",
    customerEmail: "hanako@example.com",
    customerPhone: "090-1234-5678",
  };

  const replace = (tpl: string) =>
    tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleVars[key] ?? "");

  return (
    <div className="space-y-3">
      <div>
        <span className="text-[10px] text-greige uppercase tracking-wider">件名:</span>
        <p className="text-sm font-semibold text-charcoal mt-0.5">{replace(subject)}</p>
      </div>
      <div className="rounded-lg border border-greige-light bg-white p-4">
        <h3 className="text-base font-bold text-charcoal mb-2">{replace(heading)}</h3>
        {body && <p className="text-sm text-slate mb-3">{replace(body)}</p>}
        <div className="rounded-md bg-ivory p-3 text-xs text-slate space-y-1">
          <div className="flex"><span className="w-20 text-greige">日付</span><span>2026/03/01</span></div>
          <div className="flex"><span className="w-20 text-greige">時間</span><span>14:00 (90分)</span></div>
          <div className="flex"><span className="w-20 text-greige">担当</span><span>佐藤</span></div>
          <div className="flex"><span className="w-20 text-greige">メニュー</span><span>カット、カラー</span></div>
        </div>
        {footer && <p className="mt-3 text-xs text-greige">{replace(footer)}</p>}
      </div>
    </div>
  );
}
