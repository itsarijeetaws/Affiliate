import { notFound } from "next/navigation";
import Link from "next/link";
import { buildMetadata, generateBreadcrumbSchema, SITE_URL } from "@/lib/seo";
import { apiFetch } from "@/lib/api";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import {
  normalizeStringList, computeExpertScore, computeValueScore,
  getVerdict, getAspectScores, getWhoShouldBuy, getWhoShouldSkip,
} from "@/lib/scores";
import {
  ShoppingCart, Check, X, Scale, Target,
  TrendingDown, TrendingUp, Award, BarChart2,
  ThumbsUp, AlertCircle, ChevronRight, ArrowRight,
} from "lucide-react";

export const revalidate = 900;

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number | string;
  rating: number | string;
  imageUrl: string;
  amazonAsin?: string;
  description?: string;
  pros: unknown;
  cons: unknown;
  affiliateUrl: string;
  categoryId: number | null;
  category?: { id: number; name: string; slug: string } | null;
  features: Array<{ id: number; key: string; value: string }>;
  lastUpdated?: string | null;
};

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vsIdx = slug.indexOf("-vs-");
  if (vsIdx === -1) return buildMetadata({ title: "Comparison", description: "Product comparison.", path: `/compare/${slug}` });

  const slugA = slug.slice(0, vsIdx);
  const slugB = slug.slice(vsIdx + 4);

  let nameA = slugA.replace(/-/g, " ");
  let nameB = slugB.replace(/-/g, " ");
  let priceA = 0;
  let priceB = 0;
  let ratingA = 0;
  let ratingB = 0;

  try {
    const [pA, pB] = await Promise.all([
      apiFetch<Product>(`/products/${slugA}`),
      apiFetch<Product>(`/products/${slugB}`),
    ]);
    nameA = pA.name; priceA = Number(pA.price); ratingA = Number(pA.rating);
    nameB = pB.name; priceB = Number(pB.price); ratingB = Number(pB.rating);
  } catch { /* fall back to slug-derived names */ }

  const priceSnippet = priceA > 0 && priceB > 0
    ? ` ${nameA.split(" ").slice(0, 3).join(" ")} at ₹${priceA.toLocaleString("en-IN")} vs ${nameB.split(" ").slice(0, 3).join(" ")} at ₹${priceB.toLocaleString("en-IN")}.`
    : "";

  return buildMetadata({
    title: `${nameA} vs ${nameB} — Which to Buy in India?`,
    description: `Expert side-by-side comparison of ${nameA} (${ratingA > 0 ? ratingA.toFixed(1) + "★" : ""}) and ${nameB} (${ratingB > 0 ? ratingB.toFixed(1) + "★" : ""}).${priceSnippet} Pros, cons, performance scores, and final verdict for Indian buyers.`,
    path: `/compare/${slug}`,
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CompareSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Parse "product-a-vs-product-b" — split on FIRST occurrence of "-vs-"
  const vsIdx = slug.indexOf("-vs-");
  if (vsIdx === -1) notFound();

  const slugA = slug.slice(0, vsIdx);
  const slugB = slug.slice(vsIdx + 4);
  if (!slugA || !slugB || slugA === slugB) notFound();

  // Fetch both products in parallel
  let pA: Product;
  let pB: Product;
  try {
    [pA, pB] = await Promise.all([
      apiFetch<Product>(`/products/${slugA}`),
      apiFetch<Product>(`/products/${slugB}`),
    ]);
  } catch {
    notFound();
  }

  // Normalise all values
  const prosA = normalizeStringList(pA.pros);
  const consA = normalizeStringList(pA.cons);
  const prosB = normalizeStringList(pB.pros);
  const consB = normalizeStringList(pB.cons);
  const priceA = Number(pA.price);
  const priceB = Number(pB.price);
  const rA = Number(pA.rating);
  const rB = Number(pB.rating);

  // Scores
  const scoreA = computeExpertScore(rA, prosA, consA);
  const scoreB = computeExpertScore(rB, prosB, consB);
  const valueA = computeValueScore(priceA, rA, priceB > 0 ? [priceB] : []);
  const valueB = computeValueScore(priceB, rB, priceA > 0 ? [priceA] : []);
  const verdictA = getVerdict(scoreA);
  const verdictB = getVerdict(scoreB);
  const aspectsA = getAspectScores(rA, prosA, consA);
  const aspectsB = getAspectScores(rB, prosB, consB);
  const buyA = getWhoShouldBuy(prosA, consA, priceA);
  const buyB = getWhoShouldBuy(prosB, consB, priceB);
  const skipA = getWhoShouldSkip(consA, priceA);
  const skipB = getWhoShouldSkip(consB, priceB);

  // Winner logic
  const scoreDiff = Math.abs(scoreA - scoreB);
  const isTie = scoreDiff < 0.3;
  const winner = isTie ? null : scoreA > scoreB ? pA : pB;
  const winnerScore = scoreA > scoreB ? scoreA : scoreB;
  const winnerVerdict = winner ? (scoreA > scoreB ? verdictA : verdictB) : null;

  const categoryName = pA.category?.name ?? pB.category?.name ?? "Products";
  const categorySlug = pA.category?.slug ?? pB.category?.slug ?? null;

  // Structured data
  const breadcrumb = generateBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: "Compare", url: `${SITE_URL}/compare` },
    { name: `${pA.name} vs ${pB.name}`, url: `${SITE_URL}/compare/${slug}` },
  ]);

  function productSchema(p: Product) {
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      image: p.imageUrl,
      description: p.description ?? p.name,
      sku: p.slug,
      brand: { "@type": "Brand", name: p.name.split(" ")[0] },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(p.rating).toFixed(1),
        ratingCount: Math.round(Number(p.rating) * 50),
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        price: Number(p.price).toFixed(2),
        availability: "https://schema.org/InStock",
        url: p.affiliateUrl,
        seller: { "@type": "Organization", name: "Amazon India" },
      },
    };
  }

  const priceDiff = priceA > 0 && priceB > 0 ? Math.abs(priceA - priceB) : 0;
  const cheaperProduct = priceA > 0 && priceB > 0 ? (priceA < priceB ? pA : pB) : null;

  return (
    <article className="mx-auto max-w-5xl space-y-8">
      <SeoJsonLd data={breadcrumb} />
      <SeoJsonLd data={productSchema(pA)} />
      <SeoJsonLd data={productSchema(pB)} />

      {/* ── Breadcrumb ── */}
      <nav className="flex flex-wrap items-center gap-2 text-[12px] text-gray-400 dark:text-white/35">
        <Link href="/" className="hover:text-[#FF9900] transition-colors">Home</Link>
        <span>›</span>
        <Link href="/compare" className="hover:text-[#FF9900] transition-colors">Compare</Link>
        <span>›</span>
        {categorySlug && (
          <>
            <Link href={`/category/${categorySlug}`} className="hover:text-[#FF9900] transition-colors capitalize">{categoryName}</Link>
            <span>›</span>
          </>
        )}
        <span className="text-gray-500 dark:text-white/55 line-clamp-1">
          {pA.name} vs {pB.name}
        </span>
      </nav>

      {/* ── Page header ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] overflow-hidden">
        {/* Title bar */}
        <div className="border-b border-gray-100 dark:border-white/[0.06] px-6 py-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF9900]/20 bg-[#FF9900]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF9900]">
            <Scale className="h-3 w-3" strokeWidth={2.5} /> Side-by-side Comparison
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            {pA.name} <span className="text-gray-400 dark:text-white/30">vs</span> {pB.name}
          </h1>
          <p className="mt-1.5 text-[13px] text-gray-400 dark:text-white/35">
            Expert comparison for Indian buyers · {categoryName}
          </p>
        </div>

        {/* Product hero row */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-white/[0.05]">
          {[
            { p: pA, score: scoreA, verdict: verdictA, isWinner: !isTie && winner?.slug === pA.slug },
            { p: pB, score: scoreB, verdict: verdictB, isWinner: !isTie && winner?.slug === pB.slug },
          ].map(({ p, score, verdict, isWinner }) => (
            <div key={p.slug} className={`flex flex-col items-center gap-4 p-5 sm:p-7 ${isWinner ? "bg-[#FF9900]/[0.03]" : ""}`}>
              {isWinner && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FF9900] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                  <Award className="h-2.5 w-2.5" /> Our Pick
                </span>
              )}
              {/* Image */}
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl bg-gray-50 dark:bg-white/[0.03] sm:h-36 sm:w-36">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} referrerPolicy="no-referrer"
                    className="h-full w-full object-contain p-3" />
                ) : (
                  <ShoppingCart className="h-10 w-10 text-gray-200 dark:text-white/10" />
                )}
              </div>

              <div className="text-center space-y-1.5">
                <Link href={`/product/${p.slug}`}
                  className="block text-[14px] font-bold leading-snug text-gray-800 dark:text-white/90 hover:text-[#FF9900] transition-colors line-clamp-2">
                  {p.name}
                </Link>
                {Number(p.price) > 0 && (
                  <p className="text-[20px] font-extrabold leading-none text-[#FF9900]">
                    ₹{Number(p.price).toLocaleString("en-IN")}
                  </p>
                )}
                <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold"
                  style={{ background: verdict.bgColor, border: `1px solid ${verdict.borderColor}`, color: verdict.color }}>
                  <span className="text-[14px] font-black">{score.toFixed(1)}</span>
                  <span className="opacity-50">/10</span>
                  <span className="ml-0.5 hidden sm:inline">{verdict.label}</span>
                </div>
              </div>

              <a href={p.affiliateUrl} target="_blank" rel="nofollow sponsored noopener"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#FF9900] to-[#e68a00] px-4 py-2 text-[12px] font-bold text-black shadow-[0_2px_12px_rgba(255,153,0,0.25)]">
                <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.5} />
                {Number(p.price) > 0 ? `Buy — ₹${Number(p.price).toLocaleString("en-IN")}` : "Buy on Amazon"}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ── Winner Summary ── */}
      <section className="overflow-hidden rounded-2xl border"
        style={{ borderColor: isTie ? "rgba(99,102,241,0.25)" : (winnerVerdict?.borderColor ?? "rgba(255,153,0,0.25)"),
                 background:   isTie ? "rgba(99,102,241,0.05)" : (winnerVerdict?.bgColor ?? "rgba(255,153,0,0.05)") }}>
        <div className="flex items-start gap-4 px-6 py-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: isTie ? "rgba(99,102,241,0.15)" : `${winnerVerdict?.color ?? "#FF9900"}20` }}>
            <Target className="h-5 w-5" style={{ color: isTie ? "#6366f1" : (winnerVerdict?.color ?? "#FF9900") }} strokeWidth={2} />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-white/35">Expert Verdict</p>
            {isTie ? (
              <>
                <p className="mt-0.5 text-[17px] font-black text-indigo-500">Too Close to Call</p>
                <p className="mt-1.5 text-[13px] leading-6 text-gray-600 dark:text-white/55">
                  Both products score within <strong>{scoreDiff.toFixed(1)} points</strong> of each other ({scoreA.toFixed(1)} vs {scoreB.toFixed(1)}).
                  Your choice should come down to price difference and specific features that matter to you.
                </p>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-[17px] font-black" style={{ color: winnerVerdict?.color }}>
                  {winner!.name.split(" ").slice(0, 5).join(" ")} wins
                </p>
                <p className="mt-1.5 text-[13px] leading-6 text-gray-600 dark:text-white/55">
                  Scores <strong style={{ color: winnerVerdict?.color }}>{winnerScore.toFixed(1)}/10</strong> vs{" "}
                  {(scoreA > scoreB ? scoreB : scoreA).toFixed(1)}/10 — a{" "}
                  <strong>{scoreDiff.toFixed(1)}-point</strong> advantage.{" "}
                  {winnerVerdict?.tagline}
                </p>
                {cheaperProduct && (
                  <p className="mt-2 text-[12px] text-gray-400 dark:text-white/35">
                    <span className="font-semibold text-emerald-500">{cheaperProduct.name.split(" ").slice(0, 4).join(" ")}</span> is the more affordable option
                    at ₹{priceDiff.toLocaleString("en-IN")} less.
                  </p>
                )}
              </>
            )}
          </div>
          {!isTie && (
            <div className="hidden sm:flex flex-col items-center justify-center rounded-xl border px-4 py-3 text-center"
              style={{ borderColor: winnerVerdict?.borderColor, background: `${winnerVerdict?.color}10` }}>
              <span className="text-[32px] font-black leading-none" style={{ color: winnerVerdict?.color }}>
                {winnerScore.toFixed(1)}
              </span>
              <span className="text-[11px] font-semibold text-gray-400 dark:text-white/30">/10 score</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Price Comparison ── */}
      {priceA > 0 && priceB > 0 && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e]">
          <div className="border-b border-gray-100 dark:border-white/[0.06] px-6 py-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">Price Comparison</h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-white/[0.05] p-5 gap-0">
            {[
              { p: pA, price: priceA, valueScore: valueA, isCheaper: priceA <= priceB },
              { p: pB, price: priceB, valueScore: valueB, isCheaper: priceB <= priceA },
            ].map(({ p, price, valueScore, isCheaper }) => (
              <div key={p.slug} className="flex flex-col items-center gap-2 px-4 py-2 text-center">
                <p className="text-[12px] font-semibold text-gray-500 dark:text-white/40 line-clamp-1">{p.name.split(" ").slice(0, 3).join(" ")}</p>
                <p className="text-[28px] font-extrabold leading-none text-[#FF9900]">
                  ₹{price.toLocaleString("en-IN")}
                </p>
                {isCheaper && priceA !== priceB && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500">
                    <TrendingDown className="h-2.5 w-2.5" /> Cheaper by ₹{priceDiff.toLocaleString("en-IN")}
                  </span>
                )}
                <div className="w-full space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-white/30">
                    <span>Value Score</span>
                    <span className="font-semibold">{valueScore.toFixed(1)}/10</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#FF9900] to-[#ffb347]"
                      style={{ width: `${valueScore * 10}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Performance Comparison ── */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e]">
        <div className="border-b border-gray-100 dark:border-white/[0.06] px-6 py-4 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">Performance Comparison</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-white/30 pb-1 border-b border-gray-100 dark:border-white/[0.05]">
            <span>Aspect</span>
            <span className="w-28 text-center truncate">{pA.name.split(" ").slice(0, 2).join(" ")}</span>
            <span className="w-28 text-center truncate">{pB.name.split(" ").slice(0, 2).join(" ")}</span>
          </div>
          {aspectsA.map((asp, i) => {
            const aspB = aspectsB[i];
            const aWins = asp.score > aspB.score + 0.1;
            const bWins = aspB.score > asp.score + 0.1;
            return (
              <div key={asp.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-4">
                <div>
                  <p className="text-[12px] font-semibold text-gray-700 dark:text-white/75 flex items-center gap-1">
                    <span>{asp.icon}</span> {asp.label}
                  </p>
                </div>
                {/* Score A */}
                <div className="w-28 space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className={`font-bold ${aWins ? "text-[#FF9900]" : "text-gray-400 dark:text-white/30"}`}>
                      {asp.score.toFixed(1)}
                      {aWins && " ✓"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                    <div className={`h-full rounded-full transition-all ${aWins ? "bg-[#FF9900]" : "bg-gray-300 dark:bg-white/[0.15]"}`}
                      style={{ width: `${asp.score * 10}%` }} />
                  </div>
                </div>
                {/* Score B */}
                <div className="w-28 space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className={`font-bold ${bWins ? "text-[#FF9900]" : "text-gray-400 dark:text-white/30"}`}>
                      {aspB.score.toFixed(1)}
                      {bWins && " ✓"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                    <div className={`h-full rounded-full transition-all ${bWins ? "bg-[#FF9900]" : "bg-gray-300 dark:bg-white/[0.15]"}`}
                      style={{ width: `${aspB.score * 10}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Pros & Cons ── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-gray-900 dark:text-white">
          <Check className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
          Pros &amp; Cons
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { p: pA, pros: prosA, cons: consA },
            { p: pB, pros: prosB, cons: consB },
          ].map(({ p, pros, cons }) => (
            <div key={p.slug} className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] overflow-hidden">
              <div className="border-b border-gray-100 dark:border-white/[0.05] px-4 py-3">
                <p className="text-[12px] font-bold text-gray-700 dark:text-white/80 line-clamp-1">{p.name}</p>
              </div>
              <div className="p-4 space-y-3">
                {pros.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-500">Pros</p>
                    <ul className="space-y-1.5">
                      {pros.slice(0, 4).map((pro, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-gray-600 dark:text-white/60">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" strokeWidth={2.5} />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {cons.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-rose-400">Cons</p>
                    <ul className="space-y-1.5">
                      {cons.slice(0, 3).map((con, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-gray-600 dark:text-white/60">
                          <X className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" strokeWidth={2.5} />
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who Should Buy Which ── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-gray-900 dark:text-white">
          <ThumbsUp className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
          Who Should Buy Which?
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { p: pA, buy: buyA, skip: skipA, verdict: verdictA },
            { p: pB, buy: buyB, skip: skipB, verdict: verdictB },
          ].map(({ p, buy, skip, verdict }) => (
            <div key={p.slug} className="rounded-xl border overflow-hidden"
              style={{ borderColor: verdict.borderColor, background: verdict.bgColor }}>
              <div className="border-b px-4 py-3" style={{ borderColor: verdict.borderColor }}>
                <p className="text-[12px] font-bold line-clamp-1" style={{ color: verdict.color }}>{p.name}</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-500">
                    <ThumbsUp className="h-2.5 w-2.5" /> Buy if you are
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {buy.map(seg => (
                      <span key={seg} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-emerald-500">
                        <Check className="h-2 w-2" strokeWidth={3} />{seg}
                      </span>
                    ))}
                  </div>
                </div>
                {skip.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-rose-400">
                      <AlertCircle className="h-2.5 w-2.5" /> Skip if you are
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {skip.map(seg => (
                        <span key={seg} className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-rose-400">
                          <X className="h-2 w-2" strokeWidth={3} />{seg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final Verdict ── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-gray-900 dark:text-white">
          <Target className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
          Final Verdict
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { p: pA, score: scoreA, verdict: verdictA, price: priceA },
            { p: pB, score: scoreB, verdict: verdictB, price: priceB },
          ].map(({ p, score, verdict, price }) => {
            const isPageWinner = !isTie && winner?.slug === p.slug;
            return (
              <div key={p.slug} className="rounded-xl border overflow-hidden"
                style={{ borderColor: verdict.borderColor, background: verdict.bgColor }}>
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: verdict.borderColor }}>
                  <div>
                    {isPageWinner && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#FF9900] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                        <Award className="h-2 w-2" /> Our Pick
                      </span>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: verdict.color }}>{verdict.label}</p>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[28px] font-black leading-none" style={{ color: verdict.color }}>{score.toFixed(1)}</span>
                    <span className="text-[12px] text-gray-400 dark:text-white/30">/10</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-white/85 line-clamp-2">{p.name}</p>
                  <p className="text-[12px] leading-5 text-gray-500 dark:text-white/45">{verdict.tagline}</p>
                  {price > 0 && (
                    <p className="text-[18px] font-extrabold text-[#FF9900]">₹{price.toLocaleString("en-IN")}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    <a href={p.affiliateUrl} target="_blank" rel="nofollow sponsored noopener"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#FF9900] to-[#e68a00] px-4 py-2.5 text-[13px] font-bold text-black shadow-[0_2px_12px_rgba(255,153,0,0.25)]">
                      <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.5} />
                      {price > 0 ? `Buy on Amazon — ₹${price.toLocaleString("en-IN")}` : "Buy on Amazon India"}
                    </a>
                    <Link href={`/product/${p.slug}`}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] px-4 py-2 text-[12px] font-semibold text-gray-600 dark:text-white/55 hover:border-[#FF9900]/30 hover:text-[#FF9900] transition-all">
                      Full review <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Bottom navigation ── */}
      <div className="rounded-xl border border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-gray-800 dark:text-white/85">Compare more products</p>
          <p className="text-[12px] text-gray-400 dark:text-white/35">Pick any category and compare up to 4 products</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categorySlug && (
            <Link href={`/category/${categorySlug}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-gray-600 dark:text-white/55 hover:border-[#FF9900]/30 hover:text-[#FF9900] transition-all">
              Browse {categoryName} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <Link href="/compare"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF9900]/10 border border-[#FF9900]/20 px-4 py-2 text-[13px] font-bold text-[#FF9900] hover:bg-[#FF9900]/20 transition-colors">
            <Scale className="h-3.5 w-3.5" /> Compare tool
          </Link>
        </div>
      </div>

      {/* Affiliate disclosure */}
      <p className="text-center text-[11px] text-gray-400 dark:text-white/25">
        Affiliate links — we may earn a commission at no extra cost to you.{" "}
        <Link href="/disclosure" className="underline underline-offset-2 hover:text-[#FF9900] transition-colors">Disclosure</Link>
        {" "}·{" "}
        <Link href="/methodology" className="underline underline-offset-2 hover:text-[#FF9900] transition-colors">How we score</Link>
      </p>

    </article>
  );
}
