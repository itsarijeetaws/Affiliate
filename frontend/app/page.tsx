import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { HeroBanner } from "@/components/HeroBanner";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { SubscribeSection } from "@/app/components/SubscribeSection";
import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";
import {
  Zap, Smartphone, Laptop, Headphones, Home, Dumbbell,
  Gamepad2, Watch, BatteryCharging, Scissors, Camera, Monitor,
  ShoppingCart, TrendingDown, ShieldCheck, RefreshCw, BadgeCheck,
  ArrowRight, Sparkles, Shirt, ShoppingBag, Utensils, Briefcase, Sparkle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata = buildMetadata({
  title: "BestBuysIndia — Trusted Amazon Product Reviews & Comparisons",
  description: "Expert reviews, live Amazon pricing, and honest comparisons for Indian shoppers."
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
type Category = { id: number; name: string; slug: string; description?: string | null };

export const dynamic = "force-dynamic";

// ── Category icon map ────────────────────────────────────────
const CATEGORY_ICONS: Record<string, { Icon: LucideIcon; color: string; bg: string }> = {
  electronics:             { Icon: Zap,             color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  smartphones:             { Icon: Smartphone,      color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  laptops:                 { Icon: Laptop,          color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
  "home-audio":            { Icon: Headphones,      color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  headphones:              { Icon: Headphones,      color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  "kitchen-appliances":    { Icon: Utensils,        color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "home-appliances":       { Icon: Home,            color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  fitness:                 { Icon: Dumbbell,        color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  gaming:                  { Icon: Gamepad2,        color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  smartwatches:            { Icon: Watch,           color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  "power-banks":           { Icon: BatteryCharging, color: "#14b8a6", bg: "rgba(20,184,166,0.1)" },
  grooming:                { Icon: Scissors,        color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  cameras:                 { Icon: Camera,          color: "#64748b", bg: "rgba(100,116,139,0.1)" },
  monitors:                { Icon: Monitor,         color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  "womens-fashion":        { Icon: Sparkle,         color: "#f43f5e", bg: "rgba(244,63,94,0.1)"  },
  "mens-fashion":          { Icon: Shirt,           color: "#0ea5e9", bg: "rgba(14,165,233,0.1)" },
  "bags-luggage":          { Icon: Briefcase,       color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
};
function getIcon(slug: string) {
  return CATEGORY_ICONS[slug] ?? { Icon: ShoppingCart, color: "#FF9900", bg: "rgba(255,153,0,0.1)" };
}

// ── Trust bar ────────────────────────────────────────────────
const TRUST = [
  { Icon: TrendingDown, title: "Live Pricing",   desc: "Real-time Amazon India prices",  color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  { Icon: ShieldCheck,  title: "Honest Reviews", desc: "Pros, cons, specs — no fluff",   color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  { Icon: RefreshCw,    title: "Daily Updates",  desc: "Prices refreshed automatically", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  { Icon: BadgeCheck,   title: "Verified Deals", desc: "Amazon India verified only",     color: "#FF9900", bg: "rgba(255,153,0,0.1)" },
];

// ── Carousels to show ────────────────────────────────────────
// Ordered by commission rate (high → low) so best-earning categories appear first
const CAROUSEL_CONFIGS = [
  { slug: "womens-fashion",      label: "Women's Fashion Picks",        accent: "#f43f5e", badge: "Trending" },
  { slug: "mens-fashion",        label: "Men's Fashion Picks",          accent: "#0ea5e9", badge: "Trending" },
  { slug: "bags-luggage",        label: "Top Bags & Luggage",           accent: "#a855f7", badge: "" },
  { slug: "kitchen-appliances",  label: "Kitchen Appliances",           accent: "#10b981", badge: "Hot" },
  { slug: "grooming",            label: "Grooming & Beauty",            accent: "#d97706", badge: "Trending" },
  { slug: "fitness",             label: "Fitness & Sports",             accent: "#f59e0b", badge: "" },
  { slug: "cameras",             label: "Top Cameras",                  accent: "#64748b", badge: "" },
  { slug: "smartwatches",        label: "Top Smartwatches",             accent: "#34d399", badge: "" },
  { slug: "smartphones",         label: "Best Sellers in Smartphones",  accent: "#a78bfa", badge: "Hot" },
  { slug: "laptops",             label: "Top Laptops",                  accent: "#38bdf8", badge: "Popular" },
  { slug: "headphones",          label: "Best Headphones & Earbuds",    accent: "#f472b6", badge: "" },
  { slug: "gaming",              label: "Gaming Bestsellers",           accent: "#f87171", badge: "Trending" },
] as const;

export default async function HomePage() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let totalProducts = 0;
  let totalCategories = 0;

  try {
    const data = await apiFetch<{ items: Product[]; pagination: { total: number } }>("/products?limit=12");
    products = data.items;
    totalProducts = data.pagination?.total ?? products.length;
  } catch { /* empty */ }

  try {
    const raw = await apiFetch<Category[]>("/categories");
    totalCategories = raw.length;
    categories = raw.slice(0, 8);
  } catch { /* skip */ }

  // Fetch carousel products in parallel
  const carouselResults = await Promise.allSettled(
    CAROUSEL_CONFIGS.map(cat =>
      apiFetch<{ items: Product[] }>(`/products?categorySlug=${cat.slug}&limit=12`)
        .then(d => ({ slug: cat.slug, items: d.items ?? [] }))
        .catch(() => ({ slug: cat.slug, items: [] }))
    )
  );

  const carouselMap: Record<string, Product[]> = {};
  for (const r of carouselResults) {
    if (r.status === "fulfilled") {
      carouselMap[r.value.slug] = r.value.items;
    }
  }

  // Build topImages map for hero banner (first image per carousel category)
  const topImages: Record<string, string> = {};
  for (const slug of ["womens-fashion", "mens-fashion", "bags-luggage", "smartphones", "laptops", "headphones", "gaming"] as const) {
    const img = carouselMap[slug]?.[0]?.imageUrl;
    if (img) topImages[slug] = img;
  }

  const featuredProducts = products.slice(0, 12);

  return (
    <div className="space-y-10">

      {/* ── Hero Banner Carousel ── */}
      <HeroBanner topImages={topImages} />

      {/* ── Trust signals ── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TRUST.map(({ Icon, title, desc, color, bg }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-gray-200/70 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/[0.06] dark:bg-[#16161e] dark:hover:border-white/[0.1]"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: bg }}>
              <Icon className="h-4 w-4" style={{ color }} strokeWidth={2} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-white/88">{title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-white/38">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Shop by Category ── */}
      {categories.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="section-title text-gray-900 dark:text-white">Shop by Category</h2>
            <Link href="/search" className="section-link">
              View all <ArrowRight className="inline h-3.5 w-3.5" strokeWidth={2.5} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {categories.map((cat) => {
              const { Icon, color, bg } = getIcon(cat.slug);
              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-white/[0.07] dark:bg-[#16161e] dark:hover:border-white/[0.14] dark:hover:bg-[#1c1c28]"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110"
                    style={{ background: bg }}
                  >
                    <Icon className="h-5 w-5 transition-colors" style={{ color }} strokeWidth={1.75} />
                  </span>
                  <span className="text-[13px] font-semibold leading-snug text-gray-700 group-hover:text-gray-900 dark:text-white/78 dark:group-hover:text-white">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Category Carousels (Amazon-style horizontal rows) ── */}
      {CAROUSEL_CONFIGS.map(cfg => {
        const items = carouselMap[cfg.slug] ?? [];
        if (!items.length) return null;
        return (
          <CategoryCarousel
            key={cfg.slug}
            title={cfg.label}
            categorySlug={cfg.slug}
            products={items}
            accent={cfg.accent}
            badgeLabel={cfg.badge || undefined}
          />
        );
      })}

      {/* ── Latest Reviews grid ── */}
      <section>
        <div className="section-head">
          <div>
            <h2 className="section-title text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#FF9900]" strokeWidth={2} />
              Latest Reviews
            </h2>
            <p className="mt-0.5 text-[12.5px] text-gray-400 dark:text-white/30">
              Freshly reviewed — live Amazon India pricing
            </p>
          </div>
          <Link href="/search" className="section-link">
            Browse all <ArrowRight className="inline h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.map(p => <ProductCard key={p.id} {...p} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-white/[0.07] dark:bg-[#16161e]">
            <p className="text-[13px] text-gray-400 dark:text-white/40">No products loaded. Check backend is running.</p>
          </div>
        )}

        {featuredProducts.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/search" className="btn-ghost rounded-xl px-8 py-3 text-[14px] font-semibold">
              View all {totalProducts}+ products →
            </Link>
          </div>
        )}
      </section>

      {/* ── Deal Alert ── */}
      <SubscribeSection />

    </div>
  );
}
