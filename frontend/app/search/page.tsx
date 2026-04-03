import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";

export const metadata = buildMetadata({
  title: "Search Products",
  description: "Search affiliate reviews and comparisons.",
  path: "/search"
});

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolved = await searchParams;
  const query = resolved.q?.trim() || "";
  const data = query
    ? await apiFetch<{ items: Array<{
        id: number;
        name: string;
        slug: string;
        imageUrl: string;
        price: number;
        rating: number;
      }> }>(`/products?limit=50&q=${encodeURIComponent(query)}`)
    : { items: [] };

  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">Search</h1>
        <p className="mt-3 max-w-2xl text-white/62">Find products, reviews, and category-specific picks without digging through a flat catalog.</p>
      </div>
      <form action="/search" className="flex max-w-2xl gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search products or guides"
          className="w-full rounded-full border border-white/12 bg-white/[0.08] px-5 py-3 text-white placeholder:text-white/35"
        />
        <button className="rounded-full bg-amber-300 px-5 py-3 font-semibold text-slate-950">Search</button>
      </form>
      {query ? (
        <div className="space-y-5">
          <p className="text-sm text-white/55">
            {data.items.length} result{data.items.length === 1 ? "" : "s"} for "{query}"
          </p>
          {data.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-6 text-white/62 backdrop-blur-xl">
              No products matched that search yet. Try a broader category or a shorter model name.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
