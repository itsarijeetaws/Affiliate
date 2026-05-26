import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import Link from "next/link";
import { SearchX } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Search Products — BestBuysIndia",
  description: "Search Amazon India product reviews, comparisons, and buying guides.",
  path: "/search"
});

type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  rating: number;
};

const POPULAR_SEARCHES = [
  "wireless earbuds", "gaming laptop", "air purifier",
  "smart watch", "mixer grinder", "mechanical keyboard"
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const resolved = await searchParams;
  const query = resolved.q?.trim() || "";

  let items: Product[] = [];
  try {
    const data = await apiFetch<{ items: Product[] }>(
      query ? `/products?limit=100&q=${encodeURIComponent(query)}` : `/products?limit=100`
    );
    items = data.items;
  } catch { /* show empty */ }

  // Sort
  if (resolved.sort === "rating") {
    items = [...items].sort((a, b) => Number(b.rating) - Number(a.rating));
  } else if (resolved.sort === "price-asc") {
    items = [...items].sort((a, b) => Number(a.price) - Number(b.price));
  } else if (resolved.sort === "price-desc") {
    items = [...items].sort((a, b) => Number(b.price) - Number(a.price));
  }

  return (
    <div className="space-y-8">

      {/* Search header */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-6">
        <form action="/search" method="get">
          <div className="flex gap-2">
            <div className="search-wrap flex-1 h-11">
              <input
                name="q"
                type="text"
                defaultValue={query}
                placeholder="Search products, brands, or categories…"
                className="search-input h-full text-[14px]"
                autoFocus
              />
              <button type="submit" className="search-btn h-full px-5 text-[13px] font-bold">
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Popular searches — show only when no query */}
        {!query && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-gray-400 dark:text-white/35">Popular:</span>
            {POPULAR_SEARCHES.map((s) => (
              <Link
                key={s}
                href={`/search?q=${encodeURIComponent(s)}`}
                className="rounded-full border border-gray-200 dark:border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[12px] text-gray-500 dark:text-white/55 transition hover:border-[#FF9900]/30 hover:bg-[#FF9900]/[0.07] hover:text-[#FF9900]"
              >
                {s}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Results bar + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-gray-500 dark:text-white/50">
          {query ? (
            <>
              <span className="font-semibold text-gray-900 dark:text-white">{items.length}</span> result{items.length !== 1 ? "s" : ""} for{" "}
              <span className="text-[#FF9900]">&ldquo;{query}&rdquo;</span>
            </>
          ) : (
            <>Showing all <span className="font-semibold text-gray-900 dark:text-white">{items.length}</span> products</>
          )}
        </p>

        {/* Sort */}
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-gray-400 dark:text-white/35">Sort by:</span>
          {[
            { label: "Relevance", value: "" },
            { label: "Top Rated", value: "rating" },
            { label: "Price ↑", value: "price-asc" },
            { label: "Price ↓", value: "price-desc" },
          ].map(({ label, value }) => (
            <Link
              key={label}
              href={`/search?${query ? `q=${encodeURIComponent(query)}&` : ""}${value ? `sort=${value}` : ""}`}
              className={`rounded-md px-2.5 py-1 transition ${
                (resolved.sort ?? "") === value
                  ? "bg-[#FF9900]/15 text-[#FF9900] font-semibold"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-white/45 dark:hover:bg-white/[0.06] dark:hover:text-white/75"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08] p-12 text-center">
          <SearchX className="mx-auto h-10 w-10 text-gray-300 dark:text-white/20" strokeWidth={1.5} />
          <p className="mt-3 text-[15px] font-semibold text-gray-600 dark:text-white/70">No results found</p>
          <p className="mt-1 text-[13px] text-gray-400 dark:text-white/35">
            Try a broader term, or{" "}
            <Link href="/search" className="text-[#FF9900] hover:underline">browse all products</Link>
          </p>
        </div>
      )}
    </div>
  );
}
