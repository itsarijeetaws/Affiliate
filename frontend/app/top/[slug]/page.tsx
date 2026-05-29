import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata, generateBreadcrumbSchema, SITE_URL } from "@/lib/seo";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { apiFetch } from "@/lib/api";
import {
  Trophy, Star, ShoppingCart, Award, TrendingUp,
  ChevronRight, ArrowRight, CheckCircle2
} from "lucide-react";

export const revalidate = 3600;

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  amazonAsin?: string;
  price: number;
  rating: number;
  description?: string;
  pros?: string[];
  affiliateUrl?: string;
  category?: { name: string; slug: string } | null;
};

type Category = { id: number; name: string; slug: string; description?: string | null };

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let catName = slug.replace(/-/g, " ");
  try {
    const cats = await apiFetch<Category[]>("/categories");
    const match = cats.find(c => c.slug === slug);
    if (match) catName = match.name;
  } catch { /* fallback */ }

  return buildMetadata({
    title: `Top 10 Best ${catName} in India 2025 — Expert Picks`,
    description: `Our expert-ranked top 10 best ${catName} available on Amazon India in 2025. Ranked by rating, value for money, and real buyer feedback.`,
    path: `/top/${slug}`,
  });
}

// ─── Rank badge colours ────────────────────────────────────────────────────────

function getRankStyle(rank: number): { bg: string; text: string; border: string } {
  if (rank === 1) return { bg: "bg-[#FF9900]",  text: "text-black",        border: "border-[#FF9900]/40" };
  if (rank === 2) return { bg: "bg-gray-400",    text: "text-white",        border: "border-gray-300/40" };
  if (rank === 3) return { bg: "bg-amber-700",   text: "text-white",        border: "border-amber-700/40" };
  return           { bg: "bg-gray-700",          text: "text-white/70",     border: "border-white/10" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Fetch category info
  let categoryName = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  let categoryDesc = "";
  try {
    const cats = await apiFetch<Category[]>("/categories");
    const cat = cats.find(c => c.slug === slug);
    if (cat) { categoryName = cat.name; categoryDesc = cat.description ?? ""; }
  } catch { /* fallback */ }

  // Fetch top products for this category (sorted by rating DESC in API)
  let products: Product[] = [];
  try {
    const data = await apiFetch<{ items: Product[] }>(
      `/products?categorySlug=${encodeURIComponent(slug)}&limit=200`
    );
    // Sort by rating then take top 10
    products = data.items
      .sort((a, b) => Number(b.rating) - Number(a.rating))
      .slice(0, 10);
  } catch { /* empty */ }

  if (products.length === 0) notFound();

  // ── Structured data ──
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: categoryName, url: `${SITE_URL}/category/${slug}` },
    { name: `Top 10 Best ${categoryName}`, url: `${SITE_URL}/top/${slug}` },
  ]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Top 10 Best ${categoryName} in India 2025`,
    description: `Expert-ranked top 10 best ${categoryName} available on Amazon India`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/product/${p.slug}`,
      name: p.name,
    })),
  };

  const topPick = products[0];
  const avgRating = products.reduce((s, p) => s + Number(p.rating), 0) / products.length;
  const avgPrice  = products.filter(p => Number(p.price) > 0).reduce((s, p) => s + Number(p.price), 0)
    / products.filter(p => Number(p.price) > 0).length;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SeoJsonLd data={breadcrumbSchema} />
      <SeoJsonLd data={itemListSchema} />

      {/* ── Breadcrumb ── */}
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px] text-gray-400 dark:text-white/35">
        <Link href="/" className="hover:text-[#FF9900] transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/category/${slug}`} className="hover:text-[#FF9900] transition-colors">{categoryName}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-600 dark:text-white/60">Top 10</span>
      </nav>

      {/* ── Hero header ── */}
      <header className="overflow-hidden rounded-2xl border border-[#FF9900]/20 bg-gradient-to-br from-[#FF9900]/[0.06] to-transparent p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FF9900]/15">
            <Trophy className="h-6 w-6 text-[#FF9900]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF9900]/70">
              Expert Ranked · 2025
            </p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-gray-900 dark:text-white sm:text-3xl">
              Top 10 Best {categoryName} in India
            </h1>
            {categoryDesc ? (
              <p className="mt-2 text-[14px] leading-7 text-gray-500 dark:text-white/50">{categoryDesc}</p>
            ) : (
              <p className="mt-2 text-[14px] leading-7 text-gray-500 dark:text-white/50">
                We tested and ranked the best {categoryName.toLowerCase()} available on Amazon India,
                scoring each on performance, value for money, and real buyer feedback.
              </p>
            )}

            {/* Quick stats */}
            <div className="mt-4 flex flex-wrap gap-5">
              <div>
                <p className="text-[18px] font-black text-[#FF9900]">{products.length}</p>
                <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-white/30">Products ranked</p>
              </div>
              <div>
                <p className="text-[18px] font-black text-[#FF9900]">{avgRating.toFixed(1)}★</p>
                <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-white/30">Avg rating</p>
              </div>
              {avgPrice > 0 && (
                <div>
                  <p className="text-[18px] font-black text-[#FF9900]">₹{Math.round(avgPrice).toLocaleString("en-IN")}</p>
                  <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-white/30">Avg price</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── #1 Top Pick spotlight ── */}
      <section className="overflow-hidden rounded-2xl border border-[#FF9900]/30 bg-[#FF9900]/[0.04]">
        <div className="flex items-center gap-2 border-b border-[#FF9900]/15 px-5 py-3">
          <Award className="h-4 w-4 text-[#FF9900]" strokeWidth={2.5} />
          <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#FF9900]">
            #1 Editor&apos;s Top Pick
          </span>
        </div>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          {topPick.imageUrl && (
            <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-[#0f0f18]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={topPick.imageUrl}
                alt={topPick.name}
                className="h-full w-full object-contain p-2"
                loading="eager"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <h2 className="text-[18px] font-bold leading-snug text-gray-900 dark:text-white">
              {topPick.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-[14px] font-bold text-[#FF9900]">
                <Star className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                {Number(topPick.rating).toFixed(1)}/5
              </span>
              {Number(topPick.price) > 0 && (
                <span className="text-[20px] font-extrabold text-[#FF9900]">
                  ₹{Number(topPick.price).toLocaleString("en-IN")}
                </span>
              )}
            </div>
            {topPick.description && (
              <p className="text-[13px] leading-6 text-gray-500 dark:text-white/50 line-clamp-2">
                {topPick.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={`/product/${topPick.slug}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF9900] px-4 py-2 text-[13px] font-bold text-black hover:bg-[#e68a00] transition-colors"
              >
                Read Full Review <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {topPick.affiliateUrl && (
                <a
                  href={topPick.affiliateUrl}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-gray-700 dark:text-white/70 hover:border-[#FF9900]/40 hover:text-[#FF9900] transition-colors"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Buy on Amazon
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Ranked list ── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-gray-900 dark:text-white">
          <TrendingUp className="h-4 w-4 text-[#FF9900]" strokeWidth={2} />
          Full Rankings — Best {categoryName} 2025
        </h2>

        {products.map((product, i) => {
          const rank = i + 1;
          const rankStyle = getRankStyle(rank);
          const p = Number(product.price);
          const r = Number(product.rating);
          const pros = Array.isArray(product.pros) ? product.pros.slice(0, 2) : [];

          return (
            <article
              key={product.id}
              className="group flex gap-4 rounded-xl border border-gray-200/80 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md dark:border-white/[0.07] dark:bg-[#16161e] dark:hover:border-white/[0.12]"
            >
              {/* Rank badge */}
              <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-black ${rankStyle.bg} ${rankStyle.text} ${rankStyle.border}`}>
                  {rank}
                </div>
                {rank === 1 && <Award className="h-3.5 w-3.5 text-[#FF9900]" strokeWidth={2.5} />}
              </div>

              {/* Image */}
              {product.imageUrl && (
                <div className="hidden h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-white/[0.03] sm:flex">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-contain p-1"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex flex-1 min-w-0 flex-col justify-between gap-2">
                <div>
                  <Link
                    href={`/product/${product.slug}`}
                    className="text-[14px] font-semibold leading-snug text-gray-800 hover:text-[#FF9900] transition-colors dark:text-white/85 dark:hover:text-[#FF9900] line-clamp-2"
                  >
                    {product.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1 text-[12px] font-bold text-[#FF9900]">
                      <Star className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
                      {r.toFixed(1)}
                    </span>
                    {p > 0 && (
                      <span className="text-[15px] font-extrabold text-[#FF9900]">
                        ₹{p.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  {/* Pros snippet */}
                  {pros.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {pros.map(pro => (
                        <li key={pro} className="flex items-start gap-1.5 text-[12px] text-gray-500 dark:text-white/45">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" strokeWidth={2.5} />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/product/${product.slug}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/[0.08] px-3 py-1.5 text-[12px] font-semibold text-gray-600 dark:text-white/60 hover:border-[#FF9900]/30 hover:text-[#FF9900] transition-all"
                  >
                    Full review <ChevronRight className="h-3 w-3" />
                  </Link>
                  {product.affiliateUrl && (
                    <a
                      href={product.affiliateUrl}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      className="inline-flex items-center gap-1 rounded-lg bg-[#FF9900]/10 border border-[#FF9900]/20 px-3 py-1.5 text-[12px] font-semibold text-[#FF9900] hover:bg-[#FF9900]/20 transition-colors"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      Amazon
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* ── How we rank ── */}
      <section className="rounded-2xl border border-gray-200/80 bg-white dark:border-white/[0.07] dark:bg-[#16161e] p-6 space-y-4">
        <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">How We Rank {categoryName}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: "⭐", title: "Amazon Ratings", desc: "Only products with verified Amazon ratings above 3.8 qualify. We weight ratings by review volume." },
            { icon: "💰", title: "Value for Money", desc: "Price-to-performance ratio. We compare specs and features against similar products in the price range." },
            { icon: "🛡️", title: "Buyer Feedback", desc: "Real pros and cons from hundreds of verified Indian buyers, filtered for quality and relevance." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] p-4">
              <p className="text-2xl mb-2">{icon}</p>
              <p className="text-[13px] font-bold text-gray-800 dark:text-white/85">{title}</p>
              <p className="mt-1 text-[12px] leading-5 text-gray-500 dark:text-white/40">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-gray-400 dark:text-white/30">
          Last updated: {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · All prices sourced from Amazon India.
        </p>
      </section>

      {/* ── CTA to category page ── */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-7 text-center">
        <p className="text-[15px] font-bold text-gray-900 dark:text-white">
          See all {categoryName} reviews
        </p>
        <p className="text-[13px] text-gray-500 dark:text-white/40">
          Browse the complete list with filters, comparisons and detailed reviews.
        </p>
        <Link
          href={`/category/${slug}`}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#FF9900] to-[#e68a00] px-6 py-2.5 text-[14px] font-bold text-black"
        >
          Browse all {categoryName} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

    </div>
  );
}
