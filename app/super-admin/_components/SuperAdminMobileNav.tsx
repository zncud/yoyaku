"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/app/components/LogoutButton";

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--color-gold)" : "var(--color-greige)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
      <circle cx="3" cy="6" r="1" fill={active ? "var(--color-gold)" : "var(--color-greige)"} />
      <circle cx="3" cy="12" r="1" fill={active ? "var(--color-gold)" : "var(--color-greige)"} />
      <circle cx="3" cy="18" r="1" fill={active ? "var(--color-gold)" : "var(--color-greige)"} />
    </svg>
  );
}

function PlusCircleIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--color-gold)" : "var(--color-greige)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-greige)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function SuperAdminMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-greige-light bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-end justify-around h-16 px-1">
        <TabLink href="/super-admin" label="店舗一覧" active={pathname === "/super-admin"}>
          <ListIcon active={pathname === "/super-admin"} />
        </TabLink>
        <TabLink href="/super-admin/create" label="店舗作成" active={pathname === "/super-admin/create"}>
          <PlusCircleIcon active={pathname === "/super-admin/create"} />
        </TabLink>
        <LogoutButton className="flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-4">
          <LogoutIcon />
          <span className="text-[10px] font-medium text-greige">ログアウト</span>
        </LogoutButton>
      </div>
    </nav>
  );
}

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
      className="flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-4"
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
