"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "メールアドレスまたはパスワードが正しくありません"
          : authError.message
      );
      setLoading(false);
      return;
    }

    if (redirectParam) {
      router.push(redirectParam);
      router.refresh();
      return;
    }

    // リダイレクト先をユーザー種別で判定
    try {
      const res = await fetch("/api/auth/login-redirect");
      const data = await res.json();
      router.push(data.redirect ?? "/mypage");
    } catch {
      router.push("/mypage");
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-greige-light bg-white p-6 shadow-sm"
    >
      <div className="space-y-4">
        {/* Email */}
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

        {/* Password */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate">
            パスワード
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
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit */}
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
            ログイン中...
          </>
        ) : (
          "ログイン"
        )}
      </button>
      <div className="mt-4 text-center">
        <a
          href="/forgot-password"
          className="text-xs font-medium text-gold hover:text-gold-light transition-colors"
        >
          パスワードをお忘れの方
        </a>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black tracking-widest text-charcoal uppercase">
            Login
          </h1>
          <p className="mt-2 text-sm text-slate">
            アカウントにログイン
          </p>
        </div>

        {/* Card */}
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-greige">
          Powered by Yoyaku
        </p>
      </div>
    </div>
  );
}
