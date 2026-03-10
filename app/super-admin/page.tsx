import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import StoreListClient from "./StoreListClient";

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 全店舗 + オーナー情報を取得
  const { data: stores } = await adminDb
    .from("stores")
    .select("id, name, slug, phone, owner_id, created_at")
    .order("created_at", { ascending: false });

  // オーナーのプロフィールを取得
  const ownerIds = [...new Set((stores ?? []).map((s) => s.owner_id))];
  let ownerMap: Record<string, { email: string; full_name: string | null }> = {};
  if (ownerIds.length > 0) {
    const { data: profiles } = await adminDb
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ownerIds);
    for (const p of profiles ?? []) {
      ownerMap[p.id] = { email: p.email, full_name: p.full_name };
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8 border-b border-greige-light pb-6">
        <h1 className="text-2xl font-black tracking-wider text-charcoal">
          店舗一覧
        </h1>
        <p className="mt-1 text-sm text-slate">
          全 {(stores ?? []).length} 店舗
        </p>
      </header>

      <StoreListClient
        initialStores={stores ?? []}
        ownerMap={ownerMap}
      />
    </div>
  );
}
