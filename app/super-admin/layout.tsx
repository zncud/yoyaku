import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import SuperAdminMobileNav from "./_components/SuperAdminMobileNav";
import LogoutButton from "@/app/components/LogoutButton";

export const metadata = { title: "Super Admin | YOYAKU" };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().normalize("NFKC");
}

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map(normalizeEmail)
  .filter(Boolean);

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/super-admin");
  }

  // スーパー管理者メールリストに含まれるか確認
  if (!SUPER_ADMIN_EMAILS.includes(normalizeEmail(user.email ?? ""))) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-ivory pb-20 md:pb-0">
      {/* PC: 上部バー（md以上） */}
      <nav className="hidden md:block border-b border-greige-light bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/super-admin"
              className="shrink-0 text-xs font-black tracking-[0.25em] text-charcoal uppercase"
            >
              YOYAKU<span className="ml-1.5 text-red-500">SUPER</span>
            </Link>
            <div className="flex items-center gap-1 overflow-x-auto ml-4 scrollbar-hide">
              <NavLink href="/super-admin" label="店舗一覧" />
              <NavLink href="/super-admin/create" label="店舗作成" />
              <LogoutButton className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium tracking-wide text-red-400 transition-colors hover:bg-red-50 hover:text-red-500" />
            </div>
          </div>
        </div>
      </nav>

      {/* モバイル: 下部タブバー（md未満） */}
      <SuperAdminMobileNav />

      {children}
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium tracking-wide text-slate transition-colors hover:bg-ivory-dark hover:text-charcoal"
    >
      {label}
    </Link>
  );
}
