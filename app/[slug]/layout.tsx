import { createClient } from "@/lib/supabase/server";
import { buildThemeStyle } from "@/lib/theme";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function StoreLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // slug → store_id → site_settings.theme_color を取得
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .single();

  let themeStyle: React.CSSProperties | undefined;

  if (store) {
    const { data: siteSettings } = await supabase
      .from("site_settings")
      .select("theme_color")
      .eq("store_id", store.id)
      .single();

    const primaryHex = (siteSettings?.theme_color as { primary?: string })?.primary;
    themeStyle = buildThemeStyle(primaryHex);
  }

  return <div style={themeStyle}>{children}</div>;
}
