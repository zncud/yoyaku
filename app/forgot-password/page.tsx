"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black tracking-widest text-charcoal uppercase">
            パスワードリセット
          </h1>
          <p className="mt-2 text-sm text-slate">
            登録メールアドレスにリセットリンクを送信します
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-greige-light bg-white p-6 shadow-sm text-center">
            <p className="text-sm text-charcoal font-medium">
              メールを送信しました
            </p>
            <p className="mt-2 text-xs text-slate">
              メールに記載されたリンクからパスワードを再設定してください。
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-xs font-medium text-gold hover:text-gold-light transition-colors"
            >
              ログイン画面に戻る
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-greige-light bg-white p-6 shadow-sm"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                className="w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5
                           text-sm text-charcoal placeholder:text-greige
                           transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30
                           disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`
                mt-6 flex w-full items-center justify-center gap-2 rounded-xl
                py-3 text-sm font-bold tracking-widest uppercase
                transition-all duration-200
                ${loading
                  ? "cursor-not-allowed bg-greige-light text-greige"
                  : "bg-gold text-white shadow-md shadow-gold/20 hover:bg-gold-light hover:shadow-gold/30 active:scale-[0.98]"
                }
              `}
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  送信中...
                </>
              ) : (
                "リセットメールを送信"
              )}
            </button>

            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="text-xs font-medium text-gold hover:text-gold-light transition-colors"
              >
                ログイン画面に戻る
              </Link>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-greige">
          Powered by Yoyaku
        </p>
      </div>
    </div>
  );
}
