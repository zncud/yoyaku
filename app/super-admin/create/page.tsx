"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INPUT_CLASS =
  "w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5 text-sm " +
  "text-charcoal placeholder:text-greige " +
  "transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30";

export default function CreateStorePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    phone: "",
    address: "",
    owner_email: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.slug || !form.owner_email) {
      setMessage({ type: "error", text: "店舗名、スラッグ、オーナーメールは必須です" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/super-admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "作成に失敗しました" });
      } else {
        setMessage({ type: "success", text: `店舗「${form.name}」を作成しました` });
        setTimeout(() => router.push("/super-admin"), 1500);
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8 border-b border-greige-light pb-6">
        <h1 className="text-2xl font-black tracking-wider text-charcoal">
          店舗作成
        </h1>
        <p className="mt-1 text-sm text-slate">
          新しい店舗とオーナーアカウントを作成します
        </p>
      </header>

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

      <form onSubmit={handleSubmit} className="rounded-xl border border-greige-light bg-white p-6">
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
              店舗名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="サロン名"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
              スラッグ <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-greige">/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="salon-name"
                className={INPUT_CLASS}
              />
            </div>
            <p className="mt-1 text-[10px] text-greige">
              半角英数字とハイフンのみ。予約URL: /{form.slug || "xxx"}/book
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
                電話番号
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="03-1234-5678"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
                住所
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="東京都渋谷区..."
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="border-t border-ivory-dark pt-5">
            <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
              オーナーメールアドレス <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.owner_email}
              onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
              placeholder="owner@example.com"
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-[10px] text-greige">
              既存アカウントがあればそのユーザーをオーナーに設定。なければ新規アカウントを作成します（初期パスワード: changeme123）
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gold px-8 py-3 text-sm font-bold text-white shadow-md shadow-gold/20 transition-all hover:bg-gold-light active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "作成中..." : "店舗を作成"}
          </button>
        </div>
      </form>
    </div>
  );
}
