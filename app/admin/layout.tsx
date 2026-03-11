import AdminNav from "./_components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import { buildThemeStyle } from "@/lib/theme";
import { redirect } from "next/navigation";

export const metadata = { title: "管理画面 | YOYAKU" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // middleware でも保護しているが、二重チェックで堅牢性を高める
  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // ログインユーザーの店舗 → site_settings を取得
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  // 店舗オーナーでない場合（顧客アカウント等）は弾く
  if (!store) {
    redirect("/");
  }

  let themeStyle: React.CSSProperties | undefined;
  {
    const { data: siteSettings } = await supabase
      .from("site_settings")
      .select("theme_color")
      .eq("store_id", store.id)
      .single();

    const primaryHex = (siteSettings?.theme_color as { primary?: string })?.primary;
    themeStyle = buildThemeStyle(primaryHex);
  }

  return (
    <div className="min-h-screen bg-ivory pb-20 md:pb-0" style={themeStyle}>
      <AdminNav />
      {children}
    </div>
  );
}
