"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
}

type FeedbackState =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "success" }
  | { type: "error"; message: string };

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [feedback, setFeedback] = useState<FeedbackState>({ type: "idle" });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback({ type: "saving" });

    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
      id: profile.id,
      full_name: fullName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setFeedback({ type: "error", message: error.message });
    } else {
      setFeedback({ type: "success" });
      setTimeout(() => setFeedback({ type: "idle" }), 2500);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-greige-light bg-ivory px-4 py-3 text-sm " +
    "text-charcoal placeholder-greige outline-none transition-colors " +
    "focus:border-gold focus:ring-1 focus:ring-gold/30";

  return (
    <section>
      <h2 className="mb-4 text-base font-black tracking-wider text-charcoal uppercase">
        Profile
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-greige-light bg-white p-5 shadow-sm"
      >
        {/* 氏名 */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate">
            氏名
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="山田 太郎"
            className={inputClass}
          />
        </div>

        {/* メールアドレス */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate">
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className={inputClass}
          />
        </div>

        {/* 電話番号 */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate">
            電話番号
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="090-1234-5678"
            className={inputClass}
          />
        </div>

        {/* 送信ボタン & フィードバック */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={feedback.type === "saving"}
            className={
              "rounded-lg px-6 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 " +
              (feedback.type === "saving"
                ? "cursor-wait bg-greige-light text-greige"
                : "bg-gold text-white shadow-md shadow-gold/20 hover:bg-gold-light active:scale-[0.97]")
            }
          >
            {feedback.type === "saving" ? "保存中…" : "保存する"}
          </button>

          {feedback.type === "success" && (
            <span className="text-xs font-medium text-emerald-600">
              保存しました
            </span>
          )}
          {feedback.type === "error" && (
            <span className="text-xs font-medium text-red-500">
              {feedback.message}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
