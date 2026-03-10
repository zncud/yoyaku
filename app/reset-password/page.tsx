"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black tracking-widest text-charcoal uppercase">
            新しいパスワード
          </h1>
          <p className="mt-2 text-sm text-slate">
            新しいパスワードを入力してください
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-greige-light bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate">
                新しいパスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                required
                minLength={6}
                disabled={loading}
                className="w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5
                           text-sm text-charcoal placeholder:text-greige
                           transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30
                           disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate">
                パスワード確認
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                required
                minLength={6}
                disabled={loading}
                className="w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5
                           text-sm text-charcoal placeholder:text-greige
                           transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30
                           disabled:opacity-50"
              />
            </div>
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
                更新中...
              </>
            ) : (
              "パスワードを更新"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-greige">
          Powered by Yoyaku
        </p>
      </div>
    </div>
  );
}
