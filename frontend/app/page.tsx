import { ProductCard } from "@/components/ProductCard";
import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";

export const metadata = buildMetadata({
  title: "Best Amazon Product Reviews & Comparisons",
  description: "Explore top-rated products, real pros/cons, and comparison tables."
});

type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  rating: number;
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let data: { items: Product[] } = { items: [] };
  try {
    data = await apiFetch<{ items: Product[] }>("/products?limit=12");
  } catch {
    // Keep homepage renderable even if API is temporarily unreachable.
    data = { items: [] };
  }
  const featured = data.items.slice(0, 3);

  return (
    <section className="space-y-12">
      <div className="hero-panel overflow-hidden rounded-[36px] border border-white/10 p-8 sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100">
              Premium buying guides
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Modern Amazon affiliate reviews with sharper design and clearer buying decisions.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
                We surface live product snapshots, value-focused recommendations, and polished comparison pages built for trust instead of clutter.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#top-picks" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200">
                Explore top picks
              </a>
              <a href="/compare" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Open comparison desk
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {featured.map((product, index) => (
              <div key={product.id} className="rounded-[24px] border border-white/10 bg-white/[0.08] p-5 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Featured {index + 1}</p>
                <h2 className="mt-3 text-lg font-semibold text-white">{product.name}</h2>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-white/45">Current price</p>
                    <p className="text-xl font-bold text-amber-200">Rs. {Number(product.price).toFixed(0)}</p>
                  </div>
                  <p className="text-sm text-white/65">{Number(product.rating).toFixed(1)} / 5</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Fresh automation", "Amazon-linked product ingestion with admin controls and manual fallback."],
          ["Sharper trust cues", "Clear ratings, prices, disclosures, and comparison-oriented product layouts."],
          ["Faster discovery", "Search, category filtering, and more intentional content entry points."]
        ].map(([title, description]) => (
          <div key={title} className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/62">{description}</p>
          </div>
        ))}
      </div>

      <div id="top-picks">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-white">Top Picks This Week</h2>
            <p className="mt-2 text-white/62">Freshly updated product pages and pricing snapshots for Indian buyers.</p>
          </div>
          <a href="/search" className="text-sm font-semibold text-amber-200 transition hover:text-amber-100">
            Search the catalog
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {data.items.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          Product feed is temporarily unavailable. Check server logs and environment values for
          `INTERNAL_API_URL`, `PORT`, and `DATABASE_URL`.
        </div>
      ) : null}
    </section>
  );
}
