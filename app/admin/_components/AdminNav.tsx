"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

/* ─── PC用ナビ項目 ─── */
const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "ダッシュボード" },
  { href: "/admin/staffs", label: "スタッフ管理" },
  { href: "/admin/menus", label: "メニュー管理" },
  { href: "/admin/hours", label: "営業時間" },
  { href: "/admin/blocks", label: "シフトブロック" },
  { href: "/admin/emails", label: "メール管理" },
  { href: "/admin/settings", label: "店舗設定" },
  { href: "/admin/bookings", label: "予約作成" },
  { href: "/admin/calendar", label: "予約台帳" },
];

/* ─── 店舗管理サブメニュー ─── */
const SHOP_SUB_ITEMS = [
  { href: "/admin/staffs", label: "スタッフ管理" },
  { href: "/admin/menus", label: "メニュー管理" },
  { href: "/admin/hours", label: "営業時間" },
  { href: "/admin/blocks", label: "シフトブロック" },
  { href: "/admin/emails", label: "メール管理" },
];

const SHOP_PATHS = SHOP_SUB_ITEMS.map((i) => i.href);

/* ─── SVG Icons (inline, 外部依存なし) ─── */
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--color-gold)" : "var(--color-greige)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--color-gold)" : "var(--color-greige)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ShopIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--color-gold)" : "var(--color-greige)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 7l1.5-4h15L21 7M3 7h18v3a3 3 0 01-3 3h0a3 3 0 01-3-3 3 3 0 01-3 3h0a3 3 0 01-3-3 3 3 0 01-3 3h0a3 3 0 01-3-3V7z" />
      <path d="M5 13v8h14v-8" />
    </svg>
  );
}

function GearIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--color-gold)" : "var(--color-greige)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export default function AdminNav() {
  const pathname = usePathname();
  const [shopOpen, setShopOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 外側タップで閉じる
  useEffect(() => {
    if (!shopOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShopOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [shopOpen]);

  const isShopActive = SHOP_PATHS.includes(pathname);

  return (
    <>
      {/* ─── PC: 上部バー（md以上） ─── */}
      <nav className="hidden md:block border-b border-greige-light bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/admin/dashboard"
              className="shrink-0 text-xs font-black tracking-[0.25em] text-charcoal uppercase"
            >
              YOYAKU<span className="ml-1.5 text-gold">ADMIN</span>
            </Link>
            <div className="flex items-center gap-1 overflow-x-auto ml-4 scrollbar-hide">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
                      isActive
                        ? "bg-gold/10 text-gold-dark"
                        : "text-slate hover:bg-ivory-dark hover:text-charcoal"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* ─── モバイル: 下部タブバー（md未満） ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-greige-light bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-end justify-around h-16 px-1">
          {/* ホーム */}
          <TabLink href="/admin/dashboard" label="ホーム" active={pathname === "/admin/dashboard"}>
            <HomeIcon active={pathname === "/admin/dashboard"} />
          </TabLink>

          {/* 予約台帳 */}
          <TabLink href="/admin/calendar" label="予約台帳" active={pathname === "/admin/calendar"}>
            <CalendarIcon active={pathname === "/admin/calendar"} />
          </TabLink>

          {/* 予約作成（中央強調） */}
          <Link
            href="/admin/bookings"
            className="flex flex-col items-center justify-center gap-0.5 -mt-3"
          >
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gold shadow-lg">
              <PlusIcon />
            </span>
            <span className="text-[10px] font-medium text-gold-dark">予約作成</span>
          </Link>

          {/* 店舗管理 */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShopOpen((v) => !v)}
              className="flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-2"
            >
              <ShopIcon active={isShopActive || shopOpen} />
              <span
                className={`text-[10px] font-medium ${
                  isShopActive || shopOpen ? "text-gold-dark" : "text-greige"
                }`}
              >
                店舗管理
              </span>
            </button>

            {/* サブメニュー */}
            {shopOpen && (
              <div className="absolute bottom-full mb-2 right-0 w-40 bg-white rounded-xl shadow-lg border border-greige-light overflow-hidden">
                {SHOP_SUB_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShopOpen(false)}
                      className={`block px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-gold/10 text-gold-dark"
                          : "text-charcoal hover:bg-ivory-dark"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* 設定 */}
          <TabLink href="/admin/settings" label="設定" active={pathname === "/admin/settings"}>
            <GearIcon active={pathname === "/admin/settings"} />
          </TabLink>
        </div>
      </nav>
    </>
  );
}

/* ─── 汎用タブリンク ─── */
function TabLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-2"
    >
      {children}
      <span
        className={`text-[10px] font-medium ${
          active ? "text-gold-dark" : "text-greige"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
