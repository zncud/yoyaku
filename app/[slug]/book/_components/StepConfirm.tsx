"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBooking, useBookingDispatch } from "../_context/BookingContext";
import { createClient } from "@/lib/supabase/client";

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dow = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${y}年${m}月${d}日（${dow}）`;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ── Auth Mode Toggle ── */
type AuthMode = "guest" | "login";

function AuthModeToggle({
  mode,
  onChange,
}: {
  mode: AuthMode;
  onChange: (m: AuthMode) => void;
}) {
  return (
    <div className="flex rounded-lg border border-greige-light bg-ivory-dark p-1">
      <button
        type="button"
        onClick={() => onChange("guest")}
        className={`flex-1 rounded-md px-3 py-2 text-xs font-bold tracking-wide transition-all ${
          mode === "guest"
            ? "bg-white text-charcoal shadow-sm"
            : "text-greige hover:text-charcoal-light"
        }`}
      >
        はじめての方
      </button>
      <button
        type="button"
        onClick={() => onChange("login")}
        className={`flex-1 rounded-md px-3 py-2 text-xs font-bold tracking-wide transition-all ${
          mode === "login"
            ? "bg-white text-charcoal shadow-sm"
            : "text-greige hover:text-charcoal-light"
        }`}
      >
        ログイン
      </button>
    </div>
  );
}

/* ── Guest Info Form ── */
interface GuestInfo {
  name: string;
  email: string;
  phone: string;
  password: string;
}

function GuestForm({
  value,
  onChange,
  disabled,
}: {
  value: GuestInfo;
  onChange: (v: GuestInfo) => void;
  disabled: boolean;
}) {
  const fields: { key: keyof GuestInfo; label: string; type: string; placeholder: string; required: boolean }[] = [
    { key: "name",     label: "お名前",         type: "text",     placeholder: "山田 太郎",           required: true },
    { key: "email",    label: "メールアドレス",   type: "email",    placeholder: "your@email.com",      required: true },
    { key: "phone",    label: "電話番号",         type: "tel",      placeholder: "090-1234-5678",       required: false },
    { key: "password", label: "パスワード",       type: "password", placeholder: "6文字以上",            required: true },
  ];

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h3 className="text-sm font-bold tracking-wider text-charcoal uppercase">
          Account
        </h3>
        <p className="mt-1 text-xs text-slate">
          はじめてのご予約の方は会員登録を行います
        </p>
      </div>

      {fields.map((f) => (
        <div key={f.key}>
          <label className="mb-1.5 block text-xs font-medium text-slate">
            {f.label}
            {f.required && <span className="ml-1 text-gold">*</span>}
          </label>
          <input
            type={f.type}
            value={value[f.key]}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            disabled={disabled}
            required={f.required}
            className="w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5
                       text-sm text-charcoal placeholder:text-greige
                       transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30
                       disabled:opacity-50"
          />
        </div>
      ))}
    </div>
  );
}

/* ── Login Form (inline) ── */
function LoginForm({
  onSuccess,
  disabled,
}: {
  onSuccess: (email: string) => void;
  disabled: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
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

    onSuccess(email.trim());
  }

  const isDisabled = disabled || loading;

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h3 className="text-sm font-bold tracking-wider text-charcoal uppercase">
          Login
        </h3>
        <p className="mt-1 text-xs text-slate">
          アカウントをお持ちの方はログインしてください
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate">
          メールアドレス <span className="text-gold">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={isDisabled}
          className="w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5
                     text-sm text-charcoal placeholder:text-greige
                     transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30
                     disabled:opacity-50"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate">
          パスワード <span className="text-gold">*</span>
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6文字以上"
          disabled={isDisabled}
          className="w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5
                     text-sm text-charcoal placeholder:text-greige
                     transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30
                     disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleLogin}
        disabled={isDisabled || !email.trim() || password.length < 6}
        className={`
          w-full rounded-lg py-2.5 text-sm font-bold tracking-wide transition-all
          ${isDisabled || !email.trim() || password.length < 6
            ? "cursor-not-allowed bg-greige-light text-greige"
            : "bg-charcoal text-white hover:bg-charcoal-light active:scale-[0.98]"
          }
        `}
      >
        {loading ? "ログイン中..." : "ログインして予約"}
      </button>
    </div>
  );
}

/* ── Logged-in User Info ── */
function LoggedInBadge({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20">
        <svg className="h-4 w-4 text-gold-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-xs font-medium text-gold-dark">ログイン中</p>
        <p className="text-sm text-charcoal">{email}</p>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function StepConfirm() {
  const { booking, storeData } = useBooking();
  const dispatch = useBookingDispatch();
  const router = useRouter();
  const slug = storeData.store.slug;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 認証状態
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Auth mode toggle: "guest" (register) or "login"
  const [authMode, setAuthMode] = useState<AuthMode>("guest");

  // ゲストフォーム
  const [guest, setGuest] = useState<GuestInfo>({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  // セッション確認（store_id チェック付き）
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        // profiles.store_id をチェック
        const { data: profile } = await supabase
          .from("profiles")
          .select("store_id")
          .eq("id", user.id)
          .single();

        if (profile?.store_id && profile.store_id !== booking.storeId) {
          // 別の店舗で登録されたアカウント → サインアウト
          await supabase.auth.signOut();
        } else {
          setIsLoggedIn(true);
          setUserEmail(user.email ?? null);
        }
      }
      setAuthChecked(true);
    });
  }, [booking.storeId]);

  // ログイン成功時のコールバック（store_id チェック付き）
  async function handleLoginSuccess(email: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", user.id)
        .single();

      if (profile?.store_id && profile.store_id !== booking.storeId) {
        await supabase.auth.signOut();
        setError("このアカウントは別の店舗で登録されています。");
        return;
      }
    }
    setIsLoggedIn(true);
    setUserEmail(email);
  }

  const canSubmit = (): boolean => {
    if (isLoggedIn) return true;
    if (authMode === "login") return false; // must login first
    return guest.name.trim() !== "" && guest.email.trim() !== "" && guest.password.length >= 6;
  };

  const handleSubmit = async () => {
    if (!booking.selectedDate || !booking.selectedSlot || !booking.staff) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // ── 1. POST /api/bookings ──
      const requestBody: Record<string, unknown> = {
        store_id: booking.storeId,
        staff_id: booking.staff.id,
        menu_ids: booking.menus.map((m) => m.id),
        date: toDateString(booking.selectedDate),
        slot: booking.selectedSlot,
        total_duration: booking.totalDuration,
      };

      if (!isLoggedIn) {
        requestBody.guest = {
          name: guest.name.trim(),
          email: guest.email.trim(),
          phone: guest.phone.trim(),
          password: guest.password,
        };
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "予約に失敗しました");
        setIsSubmitting(false);
        return;
      }

      // ── 2. ゲストの場合: 自動サインイン ──
      if (data.is_new_user && !isLoggedIn) {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email: guest.email.trim(),
          password: guest.password,
        });
      }

      // ── 3. 予約完了ページへ遷移 ──
      router.push(`/${slug}/complete?booking_id=${data.booking_id}`);
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  };

  const summaryItems = [
    {
      label: "スタッフ",
      value: booking.staff?.name ?? "",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      label: "メニュー",
      value: booking.menus.map((m) => m.name).join("、"),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      ),
    },
    {
      label: "日時",
      value: booking.selectedDate
        ? `${formatDate(booking.selectedDate)} ${booking.selectedSlot}`
        : "未選択",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      label: "合計所要時間",
      value: formatDuration(booking.totalDuration),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-black tracking-wider text-charcoal uppercase">
          Confirm
        </h2>
        <p className="mt-1 text-sm text-slate">
          ご予約内容をご確認ください
        </p>
      </div>

      {/* Summary Card */}
      <div className="rounded-xl border border-greige-light bg-white overflow-hidden shadow-sm">
        <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
        <div className="divide-y divide-ivory-dark p-1">
          {summaryItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3 px-5 py-4">
              <div className="mt-0.5 text-gold">{item.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium tracking-wider text-greige uppercase">
                  {item.label}
                </p>
                <p className="mt-1 font-semibold text-charcoal">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => dispatch({ type: "GO_TO_STEP", payload: storeData.staffs.length <= 1 ? "menu" : "staff" })}
        className="mt-4 w-full text-center text-xs font-medium text-greige
                   transition-colors hover:text-gold"
      >
        内容を変更する
      </button>

      {/* Auth Section */}
      <div className="mt-6">
        {!authChecked ? (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
          </div>
        ) : isLoggedIn ? (
          <LoggedInBadge email={userEmail ?? ""} />
        ) : (
          <div className="space-y-4">
            {/* Toggle: Guest ↔ Login */}
            <AuthModeToggle mode={authMode} onChange={setAuthMode} />

            {authMode === "guest" ? (
              <GuestForm value={guest} onChange={setGuest} disabled={isSubmitting} />
            ) : (
              <LoginForm onSuccess={handleLoginSuccess} disabled={isSubmitting} />
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !canSubmit() || !authChecked}
        className={`
          mt-6 flex w-full items-center justify-center gap-2 rounded-xl
          py-4 text-base font-black tracking-widest uppercase
          transition-all duration-200
          ${isSubmitting || !canSubmit() || !authChecked
            ? "cursor-not-allowed bg-greige-light text-greige"
            : "bg-gold text-white shadow-lg shadow-gold/25 hover:bg-gold-light hover:shadow-gold/30 active:scale-[0.98]"
          }
        `}
      >
        {isSubmitting ? (
          <>
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            予約処理中...
          </>
        ) : (
          "予約を確定する"
        )}
      </button>

      <p className="mt-4 text-center text-xs leading-relaxed text-greige">
        予約確定後のキャンセルはお電話にてお願いいたします
      </p>
    </div>
  );
}
