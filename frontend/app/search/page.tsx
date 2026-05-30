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
  amazonAsin?: string;
};

const POPULAR_SEARCHES = [
  "wireless earbuds", "gaming laptop", "air purifier",
  "smart watch", "mixer grinder", "mechanical keyboard"
];

const CATEGORY_TABS = [
  { slug: "womens-fashion",     label: "Women's Fashion" },
  { slug: "mens-fashion",       label: "Men's Fashion" },
  { slug: "smartphones",        label: "Smartphones" },
  { slug: "laptops",            label: "Laptops" },
  { slug: "headphones",         label: "Audio" },
  { slug: "kitchen-appliances", label: "Kitchen" },
  { slug: "smartwatches",       label: "Watches" },
  { slug: "cameras",            label: "Cameras" },
  { slug: "bags-luggage",       label: "Bags" },
  { slug: "monitors",           label: "Monitors" },
  { slug: "health-beauty",      label: "Health & Beauty" },
  { slug: "grooming",           label: "Grooming" },
  { slug: "power-banks",        label: "Power Banks" },
  { slug: "toys",               label: "Toys" },
  { slug: "books",              label: "Books" },
  { slug: "gaming",             label: "Gaming" },
];

const SORT_OPTIONS = [
  { label: "Relevance",  value: "" },
  { label: "Top Rated",  value: "rating" },
  { label: "Price ↑",    value: "price-asc" },
  { label: "Price ↓",    value: "price-desc" },
];

const PER_PAGE = 24;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string; category?: string }>;
}) {
  const resolved = await searchParams;
  const query    = resolved.q?.trim() || "";
  const sort     = resolved.sort || "";
  const page     = Math.max(1, Number(resolved.page ?? 1));
  const category = resolved.category?.trim() || "";

  const categoryLabel = CATEGORY_TABS.find(t => t.slug === category)?.label ?? "";

  let items: Product[] = [];
  let total = 0;

  try {
    const qs = new URLSearchParams({ limit: String(PER_PAGE), page: String(page) });
    if (query)    qs.set("q", query);
    if (category) qs.set("categorySlug", category);
    if (sort)     qs.set("sort", sort);

    const data = await apiFetch<{ items: Product[]; pagination: { total: number } }>(
      `/products?${qs.toString()}`
    );
    items = data.items;
    total = data.pagination?.total ?? items.length;
  } catch { /* show empty */ }

  const totalPages = Math.ceil(total / PER_PAGE);
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to   = Math.min(page * PER_PAGE, total);

  function buildHref(overrides: { q?: string; sort?: string; page?: number; category?: string }) {
    const p = new URLSearchParams();
    const q2   = "q"        in overrides ? overrides.q        : query;
    const s2   = "sort"     in overrides ? overrides.sort     : sort;
    const pg2  = "page"     in overrides ? overrides.page     : page;
    const cat2 = "category" in overrides ? overrides.category : category;
    if (q2)   p.set("q", q2);
    if (cat2) p.set("category", cat2);
    if (s2)   p.set("sort", s2);
    p.set("page", String(pg2 ?? 1));
    return `/search?${p.toString()}`;
  }

  return (
    <div className="space-y-6">

      {/* Search box */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-6">
        <form action="/search" method="get">
          {category && <input type="hidden" name="category" value={category} />}
          <div className="flex gap-2">
            <div className="search-wrap flex-1 h-11">
              <input
                name="q"
                type="text"
                defaultValue={query}
                placeholder={category ? `Search in ${categoryLabel}…` : "Search products, brands, or categories…"}
                className="search-input h-full text-[14px]"
                autoFocus
              />
              <button type="submit" className="search-btn h-full px-5 text-[13px] font-bold">
                Search
              </button>
            </div>
          </div>
        </form>

        {!query && !category && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-gray-400 dark:text-white/35">Popular:</span>
            {POPULAR_SEARCHES.map((s) => (
              <Link
                key={s}
                href={buildHref({ q: s, page: 1 })}
                className="rounded-full border border-gray-200 dark:border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[12px] text-gray-500 dark:text-white/55 transition hover:border-[#FF9900]/30 hover:bg-[#FF9900]/[0.07] hover:text-[#FF9900]"
              >
                {s}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] px-4 py-3">
        <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href={buildHref({ category: "", page: 1 })}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all whitespace-nowrap ${
              !category
                ? "bg-[#FF9900] text-black"
                : "border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/60 hover:border-[#FF9900]/40 hover:text-[#FF9900]"
            }`}
          >
            All Products
          </Link>
          {CATEGORY_TABS.map(tab => (
            <Link
              key={tab.slug}
              href={buildHref({ category: tab.slug, page: 1 })}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all whitespace-nowrap ${
                category === tab.slug
                  ? "bg-[#FF9900] text-black"
                  : "border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/60 hover:border-[#FF9900]/40 hover:text-[#FF9900]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Results bar + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-gray-500 dark:text-white/50">
          {(query || category) ? (
            <>
              <span className="font-semibold text-gray-900 dark:text-white">{from}–{to}</span> of{" "}
              <span className="font-semibold text-gray-900 dark:text-white">{total}</span> results
              {query && <> for <span className="text-[#FF9900]">&ldquo;{query}&rdquo;</span></>}
              {category && <> in <span className="text-[#FF9900]">{categoryLabel}</span></>}
            </>
          ) : (
            <>
              Showing <span className="font-semibold text-gray-900 dark:text-white">{from}–{to}</span> of{" "}
              <span className="font-semibold text-gray-900 dark:text-white">{total}</span> products
            </>
          )}
        </p>

        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-gray-400 dark:text-white/35">Sort:</span>
          {SORT_OPTIONS.map(({ label, value }) => (
            <Link
              key={label}
              href={buildHref({ sort: value, page: 1 })}
              className={`rounded-md px-2.5 py-1 transition ${
                sort === value
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
            Try a broader term{category && <>, switch to <Link href={buildHref({ category: "", page: 1 })} className="text-[#FF9900] hover:underline">All Products</Link></>}, or{" "}
            <Link href="/search" className="text-[#FF9900] hover:underline">start over</Link>
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildHref({ page: page - 1 })}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#16161e] px-4 text-[13px] font-semibold text-gray-700 dark:text-white/70 hover:border-[#FF9900]/40 hover:text-[#FF9900] transition-all"
            >
              ← Prev
            </Link>
          )}

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
              return (
                <Link
                  key={pg}
                  href={buildHref({ page: pg })}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-semibold transition-all ${
                    pg === page
                      ? "bg-[#FF9900] text-black"
                      : "border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#16161e] text-gray-600 dark:text-white/60 hover:border-[#FF9900]/40 hover:text-[#FF9900]"
                  }`}
                >
                  {pg}
                </Link>
              );
            })}
          </div>

          {page < totalPages && (
            <Link
              href={buildHref({ page: page + 1 })}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#16161e] px-4 text-[13px] font-semibold text-gray-700 dark:text-white/70 hover:border-[#FF9900]/40 hover:text-[#FF9900] transition-all"
            >
              Next →
            </Link>
          )}
        </div>
      )}

    </div>
  );
}
