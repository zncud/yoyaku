import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StoreTopPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("name, slug, phone, address, description, hero_image_url")
    .eq("slug", slug)
    .single();

  if (!store) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Hero Section */}
      {store.hero_image_url ? (
        <div className="relative h-56 w-full overflow-hidden bg-greige-light sm:h-72">
          <img
            src={store.hero_image_url}
            alt={store.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full px-6 pb-6">
            <h1 className="text-2xl font-black tracking-wider text-white sm:text-3xl">
              {store.name}
            </h1>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-greige-light px-6 py-10 text-center">
          <h1 className="text-2xl font-black tracking-wider text-charcoal sm:text-3xl">
            {store.name}
          </h1>
        </div>
      )}

      <div className="mx-auto max-w-xl px-4 py-8">
        {/* CTA Button */}
        <Link
          href={`/${slug}/book`}
          className="block rounded-xl bg-gold py-4 text-center text-sm font-bold
                     tracking-widest text-white uppercase transition-all
                     shadow-md shadow-gold/20 hover:bg-gold-light active:scale-[0.98]"
        >
          予約する
        </Link>

        {/* Store Info */}
        {store.description && (
          <div className="mt-8 rounded-xl border border-greige-light bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold tracking-wider text-greige uppercase">
              About
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate whitespace-pre-wrap">
              {store.description}
            </p>
          </div>
        )}

        {/* Access */}
        {(store.phone || store.address) && (
          <div className="mt-4 rounded-xl border border-greige-light bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold tracking-wider text-greige uppercase">
              Access
            </h2>
            <div className="mt-3 space-y-3">
              {store.address && (
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-charcoal">{store.address}</p>
                </div>
              )}
              {store.phone && (
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 shrink-0 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a
                    href={`tel:${store.phone.replace(/-/g, "")}`}
                    className="text-sm font-semibold text-gold-dark transition-colors hover:text-gold"
                  >
                    {store.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-greige">
          Powered by Yoyaku
        </p>
      </div>
    </div>
  );
}
