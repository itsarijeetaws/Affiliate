import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";
import { CompareClient } from "./CompareClient";

export const metadata = buildMetadata({
  title: "Product Comparison — BestBuysIndia",
  description: "Compare products side-by-side: price, rating, pros, cons and value for money.",
  path: "/compare"
});

export const dynamic = "force-dynamic";

type Category = { id: number; name: string; slug: string };

export default async function ComparePage() {
  let categories: Category[] = [];
  try {
    categories = await apiFetch<Category[]>("/categories");
  } catch { /* fallback to empty */ }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FF9900]/20 bg-[#FF9900]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF9900]">
          Side-by-side
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Product Comparison
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-gray-500 dark:text-white/45">
          Pick a category, choose up to 4 products, and compare price, rating, pros &amp; cons side-by-side.
        </p>
      </div>

      <CompareClient initialCategories={categories} />
    </section>
  );
}
