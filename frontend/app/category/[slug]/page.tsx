import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata, generateBreadcrumbSchema, SITE_URL } from "@/lib/seo";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { apiFetch } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import {
  BookOpen, ArrowRight,
  Zap, Smartphone, Laptop, Headphones, Home, Dumbbell,
  Gamepad2, Watch, BatteryCharging, Scissors, Camera, Monitor, Tv,
  ShoppingCart, Award, Shirt, Briefcase, Sparkle, Utensils,
  Car, Baby, Mouse, Cpu, Heart, Package, Pen
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Try to get real category name from API
  let label = slug.replace(/-/g, " ");
  try {
    const cats = await apiFetch<Array<{ slug: string; name: string }>>("/categories");
    const match = cats.find(c => c.slug === slug);
    if (match) label = match.name;
  } catch { /* fallback to slug */ }
  return buildMetadata({
    title: `Best ${label} in India 2025 — Reviews & Prices`,
    description: `Top-rated ${label} with live Amazon India pricing. Expert reviews, honest pros & cons, and value-for-money picks for Indian buyers.`,
    path: `/category/${slug}`
  });
}

type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  amazonAsin?: string;
  price: number;
  rating: number;
  category?: { slug: string; name: string } | null;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
};

type Guide = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
};

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  electronics:           { Icon: Zap,             color: "#3b82f6" },
  smartphones:           { Icon: Smartphone,      color: "#8b5cf6" },
  laptops:               { Icon: Laptop,          color: "#06b6d4" },
  "home-audio":          { Icon: Headphones,      color: "#ec4899" },
  headphones:            { Icon: Headphones,      color: "#ec4899" },
  "kitchen-appliances":  { Icon: Utensils,        color: "#10b981" },
  gaming:                { Icon: Gamepad2,        color: "#ef4444" },
  smartwatches:          { Icon: Watch,           color: "#6366f1" },
  "power-banks":         { Icon: BatteryCharging, color: "#14b8a6" },
  grooming:              { Icon: Scissors,        color: "#d97706" },
  cameras:               { Icon: Camera,          color: "#64748b" },
  monitors:              { Icon: Monitor,         color: "#7c3aed" },
  "smart-tvs":           { Icon: Tv,              color: "#0ea5e9" },
  "womens-fashion":      { Icon: Sparkle,         color: "#f43f5e" },
  "mens-fashion":        { Icon: Shirt,           color: "#0ea5e9" },
  "bags-luggage":        { Icon: Briefcase,       color: "#a855f7" },
  "home-appliances":       { Icon: Home,            color: "#10b981" },
  fitness:                 { Icon: Dumbbell,        color: "#f59e0b" },
  automotive:              { Icon: Car,             color: "#f97316" },
  "baby-kids":             { Icon: Baby,            color: "#fb7185" },
  "baby-and-kids":         { Icon: Baby,            color: "#fb7185" },
  books:                   { Icon: BookOpen,        color: "#0891b2" },
  "computer-peripherals":  { Icon: Mouse,           color: "#6366f1" },
  "health-beauty":         { Icon: Heart,           color: "#f43f5e" },
  accessories:             { Icon: Package,         color: "#a78bfa" },
  toys:                    { Icon: Gamepad2,        color: "#f59e0b" },
  sports:                  { Icon: Dumbbell,        color: "#22c55e" },
  audio:                   { Icon: Headphones,      color: "#ec4899" },
  tablets:                 { Icon: Smartphone,      color: "#8b5cf6" },
  printers:                { Icon: Cpu,             color: "#64748b" },
  watches:                 { Icon: Watch,           color: "#d97706" },
  "mobile-accessories":    { Icon: Smartphone,      color: "#6366f1" },
  "office-products":       { Icon: Pen,             color: "#475569" },
  toys:                    { Icon: Gamepad2,        color: "#f59e0b" },
};
function getIcon(slug: string) {
  return CATEGORY_ICONS[slug] ?? { Icon: ShoppingCart, color: "#FF9900" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let products: Product[] = [];
  let categoryName = slug.replace(/-/g, " ");
  let categoryDesc = "";

  try {
    const data = await apiFetch<{ items: Product[] }>(`/products?categorySlug=${encodeURIComponent(slug)}&limit=200`);
    products = data.items;
    if (products.length > 0 && products[0].category?.name) {
      categoryName = products[0].category.name;
    }
  } catch { /* empty */ }

  let categoryExists = products.length > 0;
  let categoryId: number | null = null;
  try {
    const cats = await apiFetch<Category[]>("/categories");
    const cat = cats.find((c) => c.slug === slug);
    if (cat) {
      categoryName = cat.name;
      categoryDesc = cat.description ?? "";
      categoryExists = true;
      categoryId = cat.id;
    }
  } catch { /* skip */ }

  // Slug exists in neither DB categories nor products → 404
  if (!categoryExists) notFound();

  // Fetch buying guides for this category
  let guides: Guide[] = [];
  try {
    if (categoryId) {
      const data = await apiFetch<{ items: Guide[] }>(`/api/blog?categoryId=${categoryId}&limit=10`);
      guides = data.items ?? [];
    }
  } catch { /* no guides yet */ }

  const { Icon, color } = getIcon(slug);
  const topRated = products.filter(p => Number(p.rating) >= 4.5).slice(0, 3);
  const avgRating = products.length > 0
    ? (products.reduce((s, p) => s + Number(p.rating), 0) / products.length).toFixed(1)
    : "—";

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: categoryName, url: `${SITE_URL}/category/${slug}` },
  ]);

  const itemListSchema = products.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best ${categoryName} in India`,
    description: `Top-rated ${categoryName} available on Amazon India`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/product/${p.slug}`,
      name: p.name,
    })),
  } : null;

  return (
    <div className="space-y-8">
      <SeoJsonLd data={breadcrumbSchema} />
      {itemListSchema && <SeoJsonLd data={itemListSchema} />}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[12px] text-gray-400 dark:text-white/35">
        <Link href="/" className="hover:text-[#FF9900] transition-colors">Home</Link>
        <span>›</span>
        <Link href="/search" className="hover:text-[#FF9900] transition-colors">All Products</Link>
        <span>›</span>
        <span className="text-gray-600 dark:text-white/60 capitalize">{categoryName}</span>
      </nav>

      {/* Category header */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-6 sm:p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
            <Icon className="h-7 w-7" style={{ color }} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold capitalize text-gray-900 dark:text-white sm:text-3xl">{categoryName}</h1>
            {categoryDesc && (
              <p className="mt-1.5 text-[14px] text-gray-500 dark:text-white/45">{categoryDesc}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-6">
              <div>
                <p className="text-xl font-bold text-[#FF9900]">{products.length}</p>
                <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 dark:text-white/35">Products</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[#FF9900]">{avgRating}</p>
                <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 dark:text-white/35">Avg Rating</p>
              </div>
              {topRated.length > 0 && (
                <div>
                  <p className="text-xl font-bold text-[#FF9900]">{topRated.length}</p>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 dark:text-white/35">Best Sellers</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top rated strip */}
      {topRated.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-gray-900 dark:text-white">
            <Award className="h-4 w-4 text-[#FF9900]" strokeWidth={2} />
            Best Sellers in {categoryName}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {topRated.map((p, i) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-[#FF9900]/15 bg-[#FF9900]/[0.04] p-3.5 transition hover:border-[#FF9900]/30 hover:bg-[#FF9900]/[0.08]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF9900] text-[11px] font-black text-black">
                  #{i + 1}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-[13px] font-semibold text-gray-800 dark:text-white/88 group-hover:text-gray-900 dark:group-hover:text-white">{p.name}</p>
                  <p className="text-[12px] font-bold text-[#FF9900]">{Number(p.price) > 0 ? `₹${Number(p.price).toLocaleString("en-IN")}` : "Check on Amazon"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Product grid */}
      {products.length > 0 ? (
        <section>
          <div className="section-head">
            <h2 className="section-title">All {categoryName} Reviews</h2>
            <span className="text-[12px] text-gray-400 dark:text-white/35">{products.length} products</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08] p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
            <Icon className="h-6 w-6" style={{ color }} strokeWidth={1.75} />
          </div>
          <p className="mt-3 text-[15px] font-semibold text-gray-600 dark:text-white/60">No products in this category yet</p>
          <p className="mt-1 text-[13px] text-gray-400 dark:text-white/35">
            <Link href="/search" className="text-[#FF9900] hover:underline">Browse all products</Link> or check back soon.
          </p>
        </div>
      )}

      {/* ── Buying Guides for this category ── */}
      {guides.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="section-title flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#FF9900]" strokeWidth={2} />
              Buying Guides — {categoryName}
            </h2>
            <Link href="/blog" className="section-link">
              All guides <ArrowRight className="inline h-3.5 w-3.5" strokeWidth={2.5} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map(guide => (
              <Link
                key={guide.id}
                href={`/blog/${guide.slug}`}
                className="group rounded-xl border border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-4 transition hover:border-[#FF9900]/30 hover:shadow-md dark:hover:border-[#FF9900]/20"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF9900]/70">Buying Guide</span>
                <h3 className="mt-1.5 text-[14px] font-semibold leading-snug text-gray-800 dark:text-white/85 group-hover:text-gray-900 dark:group-hover:text-white line-clamp-2">
                  {guide.title}
                </h3>
                {guide.excerpt && (
                  <p className="mt-1.5 text-[12px] leading-5 text-gray-500 dark:text-white/40 line-clamp-2">{guide.excerpt}</p>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#FF9900]">
                  Read guide <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top 10 list link */}
      <div className="rounded-xl border border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-gray-800 dark:text-white/85">
            See our expert-ranked Top 10
          </p>
          <p className="text-[12px] text-gray-400 dark:text-white/35">
            Best {categoryName} ranked by rating, value & buyer feedback
          </p>
        </div>
        <Link
          href={`/top/${slug}`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#FF9900]/10 border border-[#FF9900]/20 px-4 py-2 text-[13px] font-bold text-[#FF9900] hover:bg-[#FF9900]/20 transition-colors whitespace-nowrap"
        >
          Top 10 list <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

    </div>
  );
}
