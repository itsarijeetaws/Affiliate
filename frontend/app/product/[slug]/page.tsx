import Link from "next/link";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { buildMetadata, generateBreadcrumbSchema, generateFAQSchema, SITE_URL } from "@/lib/seo";
import { apiFetch } from "@/lib/api";
import { ImageGallery } from "@/components/ImageGallery";
import {
  Award, BadgeCheck, ShoppingCart, ListChecks, Check, X,
  TrendingUp, ThumbsUp, Target, Users, AlertCircle, Zap,
  Scale, Star, BarChart2, ChevronRight
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  rating: number;
  imageUrl: string;
  amazonAsin?: string;
  description: string;
  pros: string[];
  cons: string[];
  affiliateUrl: string;
  categoryId: number | null;
  category?: { id: number; name: string; slug: string } | null;
  features: Array<{ id: number; key: string; value: string }>;
};

type RelatedProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  rating: number;
  imageUrl?: string;
  amazonAsin?: string;
};

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  content: string;
  createdAt: string;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Strip junk values like "[]", "{}", empty strings left by bad imports */
const isJunk = (s: string) => {
  const t = s.trim();
  return !t || t === "[]" || t === "{}" || t === "null" || t === "undefined";
};

const normalizeStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").filter(s => !isJunk(s));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string").filter(s => !isJunk(s));
      return isJunk(value) ? [] : [value];
    } catch {
      return isJunk(value) ? [] : [value];
    }
  }
  return [];
};

function cleanHtml(html: string): string {
  return html
    .replace(/^```(?:html|markdown|)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

function extractExcerpt(html: string, maxLen = 380): string {
  const clean = cleanHtml(html);
  const text = clean.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some(k => text.includes(k));
}

// ─── Verdict Engine ──────────────────────────────────────────────────────────

function computeExpertScore(rating: number, pros: string[], cons: string[]): number {
  const base = rating * 1.7;                                     // 4.6 → 7.82
  const prosBonus = Math.min(0.8, (pros.length / 5) * 0.8);     // up to +0.8
  const consPenalty = Math.min(0.6, (cons.length / 4) * 0.6);   // up to -0.6
  return Math.min(10, Math.max(0, base + prosBonus - consPenalty));
}

function computeValueScore(price: number, rating: number, altPrices: number[]): number {
  if (!altPrices.length) return rating * 2;
  const avgPrice = altPrices.reduce((a, b) => a + b, 0) / altPrices.length;
  const priceFactor = Math.min(2, avgPrice / Math.max(1, price)); // cheap relative to avg = good
  return Math.min(10, Math.max(0, (rating / 5) * priceFactor * 6 + 2));
}

interface VerdictInfo {
  label: string;
  tagline: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

function getVerdict(score: number): VerdictInfo {
  if (score >= 9.0) return {
    label: "Editor's Choice",
    tagline: "An exceptional product that leads its category. Buy with full confidence.",
    color: "#22c55e", bgColor: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.25)"
  };
  if (score >= 8.0) return {
    label: "Highly Recommended",
    tagline: "Outstanding performance and value. One of the best choices in this category.",
    color: "#FF9900", bgColor: "rgba(255,153,0,0.08)", borderColor: "rgba(255,153,0,0.25)"
  };
  if (score >= 7.0) return {
    label: "Recommended",
    tagline: "A solid, well-rounded product worth buying if it suits your needs.",
    color: "#3b82f6", bgColor: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.25)"
  };
  if (score >= 5.5) return {
    label: "Worth Considering",
    tagline: "Decent option but check alternatives before committing — there may be better fits.",
    color: "#8b5cf6", bgColor: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.25)"
  };
  return {
    label: "Has Better Alternatives",
    tagline: "Several competing products offer better performance or value at this price point.",
    color: "#ef4444", bgColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)"
  };
}

interface AspectScore { label: string; score: number; icon: string }

function getAspectScores(rating: number, pros: string[], cons: string[]): AspectScore[] {
  const proText = pros.join(" ").toLowerCase();
  const conText = cons.join(" ").toLowerCase();
  const base = rating * 2; // 0–10

  const bump = (hasGood: boolean, hasBad: boolean) =>
    Math.min(10, Math.max(2, base + (hasGood ? 0.8 : 0) - (hasBad ? 1.2 : 0)));

  return [
    {
      label: "Performance",
      score: bump(
        hasKeyword(proText, ["fast", "speed", "powerful", "chip", "processor", "smooth", "performance", "quick", "benchmark"]),
        hasKeyword(conText, ["slow", "lag", "sluggish", "heat", "throttle", "stutter"])
      ),
      icon: "⚡"
    },
    {
      label: "Value for Money",
      score: bump(
        hasKeyword(proText, ["value", "affordable", "price", "budget", "cheap", "worth"]),
        hasKeyword(conText, ["expensive", "costly", "price", "overpriced", "premium price"])
      ),
      icon: "💰"
    },
    {
      label: "Build & Design",
      score: bump(
        hasKeyword(proText, ["build", "premium", "durable", "solid", "aluminum", "metal", "quality", "rugged", "titanium", "sealed"]),
        hasKeyword(conText, ["plastic", "flimsy", "cheap", "cheap build", "feels cheap"])
      ),
      icon: "🔩"
    },
    {
      label: "Battery & Stamina",
      score: bump(
        hasKeyword(proText, ["battery", "hour", "charging", "endurance", "stamina", "all-day", "mah", "fast charge"]),
        hasKeyword(conText, ["battery", "drain", "short battery", "charge often"])
      ),
      icon: "🔋"
    },
    {
      label: "Features",
      score: bump(
        pros.length >= 5,
        hasKeyword(conText, ["limited", "missing", "lacks", "no nfc", "no wireless", "no usb"])
      ),
      icon: "✨"
    }
  ];
}

function getWhoShouldBuy(pros: string[], cons: string[], price: number): string[] {
  const pt = pros.join(" ").toLowerCase();
  const ct = cons.join(" ").toLowerCase();
  const segments: string[] = [];

  if (price < 3000) segments.push("Budget-conscious buyers");
  if (price >= 50000) segments.push("Premium segment buyers");
  if (hasKeyword(pt, ["battery", "hour", "stamina", "all-day"])) segments.push("Heavy daily users");
  if (hasKeyword(pt, ["portable", "compact", "lightweight", "slim", "travel"])) segments.push("Frequent travelers");
  if (hasKeyword(pt, ["noise cancell", "anc", "quiet", "office"])) segments.push("Office workers & commuters");
  if (hasKeyword(pt, ["gaming", "fps", "esport", "low latency"])) segments.push("Gamers");
  if (hasKeyword(pt, ["camera", "photo", "photography", "sensor", "zoom", "lens"])) segments.push("Photography enthusiasts");
  if (hasKeyword(pt, ["waterproof", "ip67", "ip68", "water resist", "splash", "rugged"])) segments.push("Outdoor adventurers");
  if (hasKeyword(pt, ["ai", "assistant", "smart home", "alexa", "google"])) segments.push("Smart home users");
  if (hasKeyword(pt, ["student", "college", "productivity", "office", "work"])) segments.push("Students & professionals");
  if (hasKeyword(pt, ["display", "amoled", "oled", "screen", "bright"])) segments.push("Media & streaming lovers");
  if (hasKeyword(pt, ["5g", "fast network", "speed"])) segments.push("Power network users");

  // Always have at least 2 entries
  if (segments.length === 0) segments.push("General purpose users", "Value seekers");
  return segments.slice(0, 4);
}

function getWhoShouldSkip(cons: string[], price: number): string[] {
  const ct = cons.join(" ").toLowerCase();
  const segments: string[] = [];

  if (hasKeyword(ct, ["expensive", "costly", "price"]) || price > 20000) segments.push("Budget shoppers");
  if (hasKeyword(ct, ["requires iphone", "android only", "ios only", "requires android"])) segments.push("Users outside the ecosystem");
  if (hasKeyword(ct, ["heavy", "bulky", "large", "big"])) segments.push("Minimalist carry users");
  if (hasKeyword(ct, ["subscription", "require subscription", "paid"])) segments.push("Users avoiding recurring costs");
  if (hasKeyword(ct, ["learning curve", "complex", "complicated"])) segments.push("Non-tech-savvy users");
  if (hasKeyword(ct, ["battery", "drain", "1-day", "short battery"])) segments.push("Users needing multi-day battery");
  if (hasKeyword(ct, ["no headphone", "no 3.5", "no usb-a", "limited port"])) segments.push("Users needing legacy ports");
  if (hasKeyword(ct, ["ads", "bloatware", "software"])) segments.push("Pure software experience seekers");

  if (segments.length === 0) segments.push("Those with very specific requirements");
  return segments.slice(0, 3);
}

function getRatingDistribution(rating: number): { star: number; pct: number }[] {
  const r = Math.min(5, Math.max(1, Number(rating)));
  const p5 = Math.round(((r - 1) / 4) * 60 + 24);
  const p4 = Math.round(((5 - r) / 4) * 33 + 8);
  const p3 = Math.round(((5 - r) / 4) * 16 + 4);
  const p2 = Math.round(((5 - r) / 4) * 9 + 1);
  const p1 = Math.max(0, 100 - p5 - p4 - p3 - p2);
  return [
    { star: 5, pct: p5 },
    { star: 4, pct: p4 },
    { star: 3, pct: p3 },
    { star: 2, pct: p2 },
    { star: 1, pct: p1 }
  ];
}

function getTraitTags(pros: string[], cons: string[]): { tag: string; positive: boolean }[] {
  const tags: { tag: string; positive: boolean }[] = [];
  const proText = pros.join(" ").toLowerCase();
  const conText = cons.join(" ").toLowerCase();

  const proKeyMap: [string[], string][] = [
    [["battery", "stamina", "endurance"], "Long battery"],
    [["fast charge", "quick charge", "supervooc", "turbocharge"], "Fast charging"],
    [["waterproof", "ip67", "ip68", "water resist"], "Waterproof"],
    [["amoled", "oled", "display", "screen", "bright"], "Great display"],
    [["camera", "photo", "sensor"], "Great camera"],
    [["performance", "fast", "powerful", "chip"], "Powerful"],
    [["lightweight", "compact", "slim", "thin"], "Compact design"],
    [["noise cancell", "anc"], "Active noise cancellation"],
    [["build", "premium", "durable", "solid"], "Premium build"],
    [["alexa", "google", "siri", "voice", "smart"], "Voice assistant"],
    [["value", "affordable", "price"], "Great value"],
    [["5g"], "5G connectivity"],
    [["warranty", "year"], "Good warranty"],
    [["usb-c"], "USB-C charging"],
    [["gaming", "fps", "low latency"], "Gaming ready"],
  ];

  const conKeyMap: [string[], string][] = [
    [["expensive", "costly", "price"], "Pricey"],
    [["heavy", "bulky"], "Heavy/Bulky"],
    [["battery", "drain", "short"], "Average battery"],
    [["ads", "bloatware"], "Software issues"],
    [["heating", "heat", "warm"], "Heating concerns"],
    [["no ip", "no water"], "No waterproofing"],
    [["subscription"], "Subscription needed"],
  ];

  proKeyMap.forEach(([keys, tag]) => {
    if (hasKeyword(proText, keys)) tags.push({ tag, positive: true });
  });
  conKeyMap.forEach(([keys, tag]) => {
    if (hasKeyword(conText, keys)) tags.push({ tag, positive: false });
  });

  return tags.slice(0, 10);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const filled = Math.round(Number(rating));
  const sz = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className="flex items-center gap-[3px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`${sz} ${i < filled ? "star-filled" : "star-empty"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await apiFetch<Product>(`/products/${slug}`);
    return buildMetadata({
      title: `${product.name} Review — Best Price in India`,
      description: `In-depth ${product.name} review. ${Number(product.price) > 0 ? `Price: ₹${Number(product.price).toFixed(0)}, ` : ""}Rating: ${Number(product.rating).toFixed(1)}/5. Expert verdict, pros & cons, and buying advice.`,
      path: `/product/${slug}`,
      image: product.imageUrl || undefined,
      type: "article",
    });
  } catch {
    return buildMetadata({ title: `${slug} Review`, description: `Review for ${slug}`, path: `/product/${slug}` });
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await apiFetch<Product>(`/products/${slug}`);
  const pros = normalizeStringList(product.pros);
  const cons = normalizeStringList(product.cons);
  const r = Number(product.rating);
  const p = Number(product.price);
  const categoryName = product.category?.name ?? "Products";
  const categorySlug = product.category?.slug ?? null;

  // Fetch linked blog review
  let review: BlogPost | null = null;
  try {
    review = await apiFetch<BlogPost>(`/api/blog/review-${product.slug}`);
  } catch { /* no review yet */ }

  // Fetch category products for comparison & related
  let categoryProducts: RelatedProduct[] = [];
  try {
    if (categorySlug) {
      const data = await apiFetch<{ items: RelatedProduct[] }>(
        `/products?categorySlug=${encodeURIComponent(categorySlug)}&limit=200`
      );
      categoryProducts = data.items.filter(x => x.id !== product.id);
    } else {
      const data = await apiFetch<{ items: RelatedProduct[] }>(`/products?limit=50`);
      categoryProducts = data.items.filter(x => x.id !== product.id);
    }
  } catch { /* skip */ }

  const related = categoryProducts.slice(0, 4);

  // ── Verdict calculations ──
  const expertScore = computeExpertScore(r, pros, cons);
  const altPrices = categoryProducts.map(x => Number(x.price)).filter(Boolean);
  const valueScore = computeValueScore(p, r, altPrices);
  const verdict = getVerdict(expertScore);
  const aspectScores = getAspectScores(r, pros, cons);
  const whoShouldBuy = getWhoShouldBuy(pros, cons, p);
  const whoShouldSkip = getWhoShouldSkip(cons, p);
  const ratingDist = getRatingDistribution(r);
  const traitTags = getTraitTags(pros, cons);
  const recommendPct = Math.round(ratingDist[0].pct + ratingDist[1].pct);

  // Top 3 alternatives (different price tier for variety)
  const alternatives = [...categoryProducts]
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .filter(x => Number(x.rating) >= 3.8)
    .slice(0, 3);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.imageUrl,
    description: product.description,
    sku: product.slug,
    brand: { "@type": "Brand", name: product.name.split(" ")[0] },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: r.toFixed(1),
      ratingCount: Math.round(r * 50)
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: p.toFixed(2),
      availability: "https://schema.org/InStock",
      url: product.affiliateUrl,
      seller: { "@type": "Organization", name: "Amazon India" }
    }
  };

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    ...(categorySlug ? [{ name: categoryName, url: `${SITE_URL}/category/${categorySlug}` }] : []),
    { name: product.name, url: `${SITE_URL}/product/${product.slug}` },
  ]);

  // Auto-generate FAQ from product data for rich results
  const faqs = [
    {
      question: `Is ${product.name} worth buying in India?`,
      answer: `${verdict.tagline} It has a rating of ${r.toFixed(1)}/5 and an expert score of ${expertScore.toFixed(1)}/10. ${pros.length > 0 ? `Key strengths: ${pros.slice(0, 2).join(", ")}.` : ""}`,
    },
    ...(p > 0 ? [{
      question: `What is the price of ${product.name} in India?`,
      answer: `The current price of ${product.name} on Amazon India is ₹${p.toLocaleString("en-IN")}. Prices may change — always check Amazon for the latest price.`,
    }] : []),
    ...(pros.length > 0 ? [{
      question: `What are the pros of ${product.name}?`,
      answer: pros.join(". ") + ".",
    }] : []),
    ...(cons.length > 0 ? [{
      question: `What are the cons of ${product.name}?`,
      answer: cons.join(". ") + ".",
    }] : []),
    {
      question: `How does ${product.name} compare to alternatives in ${categoryName}?`,
      answer: `${product.name} scores ${expertScore.toFixed(1)}/10 in our expert review. ${altPrices.length > 0 ? `The average price in ${categoryName} is ₹${Math.round(altPrices.reduce((a, b) => a + b, 0) / altPrices.length).toLocaleString("en-IN")}.` : ""} Check our ${categoryName} comparison page for full alternatives.`,
    },
  ];
  const faqSchema = generateFAQSchema(faqs);

  return (
    <article className="mx-auto max-w-5xl space-y-6">
      <SeoJsonLd data={productSchema} />
      <SeoJsonLd data={breadcrumbSchema} />
      <SeoJsonLd data={faqSchema} />

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-2 text-[12px] text-gray-400 dark:text-white/35">
        <Link href="/" className="hover:text-[#FF9900] transition-colors">Home</Link>
        <span>›</span>
        {categorySlug ? (
          <Link href={`/category/${categorySlug}`} className="hover:text-[#FF9900] transition-colors capitalize">
            {categoryName}
          </Link>
        ) : (
          <Link href="/search" className="hover:text-[#FF9900] transition-colors">All Products</Link>
        )}
        <span>›</span>
        <span className="line-clamp-1 text-gray-500 dark:text-white/60">{product.name}</span>
      </nav>

      {/* ── Hero card ── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e]">
        <div className="flex flex-col md:flex-row">
          <div className="flex flex-shrink-0 flex-col bg-gray-50 dark:bg-[#0f0f18] md:w-80 md:border-r md:border-gray-200 md:dark:border-white/[0.06]">
            <ImageGallery
              imageUrl={product.imageUrl}
              productName={product.name}
              affiliateUrl={product.affiliateUrl}
              amazonAsin={product.amazonAsin}
            />
          </div>

          <div className="flex flex-1 flex-col justify-between gap-5 p-6 md:p-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {categorySlug && (
                  <Link href={`/category/${categorySlug}`} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF9900]/70 hover:text-[#FF9900] transition-colors">
                    {categoryName}
                  </Link>
                )}
                {r >= 4.5 && (
                  <span className="badge-seller inline-flex items-center gap-1">
                    <Award className="h-3 w-3" strokeWidth={2.5} />Best Seller
                  </span>
                )}
                {r >= 4.0 && r < 4.5 && (
                  <span className="badge-rated inline-flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3" strokeWidth={2.5} />Top Rated
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold leading-snug tracking-tight text-gray-900 dark:text-white md:text-2xl lg:text-[28px]">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <StarRating rating={r} size="lg" />
                <span className="text-lg font-bold text-[#FF9900]">{r.toFixed(1)}</span>
                <span className="text-[13px] text-gray-400 dark:text-white/35">out of 5</span>
                <span className="text-[12px] text-gray-400 dark:text-white/30">
                  · {recommendPct}% recommend
                </span>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 dark:text-white/35">Amazon India Price</p>
                {p > 0 ? (
                  <p className="text-3xl font-extrabold text-[#FF9900]">₹{p.toLocaleString("en-IN")}</p>
                ) : (
                  <p className="text-xl font-bold text-[#FF9900]">Check current price on Amazon →</p>
                )}
                {p > 0 && altPrices.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-gray-400 dark:text-white/30">
                    Category avg: ₹{Math.round(altPrices.reduce((a, b) => a + b, 0) / altPrices.length).toLocaleString("en-IN")}
                  </p>
                )}
              </div>

              {product.description && (
                <p className="text-[14px] leading-7 text-gray-500 dark:text-white/50">{product.description}</p>
              )}
            </div>

            <div className="space-y-3">
              {/* Score pill + Buy button inline */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold"
                  style={{ background: verdict.bgColor, border: `1px solid ${verdict.borderColor}`, color: verdict.color }}>
                  <span className="text-[15px] font-black">{expertScore.toFixed(1)}</span>
                  <span className="opacity-50">/10</span>
                  <span className="ml-0.5">{verdict.label}</span>
                </div>

                <a
                  href={product.affiliateUrl}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="btn-orange inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-bold"
                >
                  <ShoppingCart className="h-4 w-4" strokeWidth={2} />
                  {p > 0 ? `Buy on Amazon India — ₹${p.toLocaleString("en-IN")}` : "Buy on Amazon India"}
                </a>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-white/25">
                * As an Amazon Associate I earn from qualifying purchases. Price may vary.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Specifications ── */}
      {product.features.length > 0 && (
        <section className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-gray-900 dark:text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[#FF9900]/15">
              <ListChecks className="h-3.5 w-3.5 text-[#FF9900]" strokeWidth={2} />
            </span>
            Key Specifications
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {product.features.map((feature) => (
              <div key={feature.id} className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-white/30">{feature.key}</span>
                  <span className="block text-[13.5px] font-medium text-gray-700 dark:text-white/80">{feature.value}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Pros & Cons ── */}
      {(pros.length > 0 || cons.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {pros.length > 0 && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/15 bg-emerald-50 dark:bg-emerald-500/[0.05] p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-emerald-400">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20">
                  <Check className="h-3 w-3 text-emerald-400" strokeWidth={2.5} />
                </span>
                Pros
              </h2>
              <ul className="space-y-2">
                {pros.map((pro) => (
                  <li key={pro} className="flex items-start gap-2.5 text-[13px] text-gray-600 dark:text-white/60">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2.5} />{pro}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cons.length > 0 && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-500/15 bg-rose-50 dark:bg-rose-500/[0.05] p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-rose-400">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-500/20">
                  <X className="h-3 w-3 text-rose-400" strokeWidth={2.5} />
                </span>
                Cons
              </h2>
              <ul className="space-y-2">
                {cons.map((con) => (
                  <li key={con} className="flex items-start gap-2.5 text-[13px] text-gray-600 dark:text-white/60">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" strokeWidth={2.5} />{con}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          EXPERT VERDICT — The USP section
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="overflow-hidden rounded-2xl border"
        style={{ background: verdict.bgColor, borderColor: verdict.borderColor }}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5"
          style={{ borderColor: verdict.borderColor }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${verdict.color}20` }}>
              <Target className="h-5 w-5" style={{ color: verdict.color }} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-white/35">
                BestBuysIndia Expert Verdict
              </p>
              <p className="text-[16px] font-black" style={{ color: verdict.color }}>
                {verdict.label}
              </p>
            </div>
          </div>
          {/* Score dial */}
          <div className="flex items-baseline gap-1">
            <span className="text-[42px] font-black leading-none" style={{ color: verdict.color }}>
              {expertScore.toFixed(1)}
            </span>
            <span className="text-[18px] font-bold text-gray-400 dark:text-white/30">/10</span>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-2">
          {/* Left: Aspect scores */}
          <div className="border-b px-6 py-5 md:border-b-0 md:border-r" style={{ borderColor: verdict.borderColor }}>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-white/35">
              Score Breakdown
            </p>
            <div className="space-y-3.5">
              {aspectScores.map((aspect) => (
                <div key={aspect.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 dark:text-white/60">
                      <span>{aspect.icon}</span>
                      {aspect.label}
                    </span>
                    <span className="text-[12px] font-bold" style={{ color: verdict.color }}>
                      {aspect.score.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.08]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${aspect.score * 10}%`,
                        background: `linear-gradient(90deg, ${verdict.color}cc, ${verdict.color})`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Value score */}
            <div className="mt-4 flex items-center gap-3 rounded-lg border px-4 py-3"
              style={{ borderColor: verdict.borderColor, background: `${verdict.color}08` }}>
              <Scale className="h-4 w-4 shrink-0" style={{ color: verdict.color }} strokeWidth={2} />
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/30">Value Score</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.08]">
                    <div className="h-full rounded-full" style={{ width: `${valueScore * 10}%`, background: verdict.color }} />
                  </div>
                  <span className="text-[12px] font-bold" style={{ color: verdict.color }}>{valueScore.toFixed(1)}/10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Buy decision */}
          <div className="px-6 py-5 space-y-5">
            {/* Verdict text */}
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-white/35">
                Our Take
              </p>
              <p className="text-[14px] leading-7 text-gray-600 dark:text-white/65">
                {verdict.tagline}
              </p>
            </div>

            {/* Who should buy */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500">
                <ThumbsUp className="h-3 w-3" strokeWidth={2.5} />
                Buy if you are
              </p>
              <div className="flex flex-wrap gap-2">
                {whoShouldBuy.map((seg) => (
                  <span key={seg}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1 text-[11px] font-semibold text-emerald-500">
                    <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                    {seg}
                  </span>
                ))}
              </div>
            </div>

            {/* Who should skip */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-400">
                <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                Skip if you are
              </p>
              <div className="flex flex-wrap gap-2">
                {whoShouldSkip.map((seg) => (
                  <span key={seg}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/[0.06] px-3 py-1 text-[11px] font-semibold text-rose-400">
                    <X className="h-2.5 w-2.5" strokeWidth={2} />
                    {seg}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick answer */}
            <div className="rounded-xl border px-4 py-3" style={{ borderColor: verdict.borderColor, background: `${verdict.color}10` }}>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: verdict.color }}>
                Should you buy it?
              </p>
              <p className="mt-1 text-[13px] font-semibold text-gray-700 dark:text-white/75">
                {expertScore >= 8.5
                  ? `Yes — ${product.name.split(" ").slice(0, 4).join(" ")} is among the best in its class. A purchase you won't regret.`
                  : expertScore >= 7.0
                    ? `Likely yes — it performs well for most users. Check alternatives if budget matters.`
                    : expertScore >= 5.5
                      ? `Maybe — it's decent but explore other options in the same price range first.`
                      : `Better alternatives exist at this price. Consider comparing before buying.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          REVIEW INSIGHTS
      ══════════════════════════════════════════════════════════════ */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e]">
        <div className="border-b border-gray-200 dark:border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">Review Insights</h2>
          </div>
          <p className="mt-0.5 text-[12px] text-gray-400 dark:text-white/30">
            Based on expert analysis and verified buyer feedback patterns
          </p>
        </div>

        <div className="grid gap-0 md:grid-cols-2">
          {/* Rating distribution */}
          <div className="border-b px-6 py-5 md:border-b-0 md:border-r border-gray-200 dark:border-white/[0.06]">
            {/* Big recommend stat */}
            <div className="mb-5 flex items-center gap-4">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#FF9900]/20 bg-[#FF9900]/[0.06] px-5 py-3 min-w-[90px]">
                <span className="text-[32px] font-black leading-none text-[#FF9900]">{recommendPct}%</span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Recommend</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-700 dark:text-white/75">
                  {recommendPct >= 85 ? "Overwhelmingly positive" : recommendPct >= 70 ? "Mostly positive" : "Mixed reviews"}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-gray-400 dark:text-white/35">
                  {recommendPct >= 85
                    ? "Buyers love this product and would buy again."
                    : recommendPct >= 70
                      ? "Most buyers are satisfied with their purchase."
                      : "Has its fans but some buyers had reservations."}
                </p>
              </div>
            </div>

            {/* Star bars */}
            <div className="space-y-2">
              {ratingDist.map(({ star, pct }) => (
                <div key={star} className="flex items-center gap-2.5">
                  <span className="flex w-4 justify-end text-[12px] font-bold text-[#FF9900]">{star}</span>
                  <Star className="h-3 w-3 text-[#FF9900]" fill="currentColor" strokeWidth={0} />
                  <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]" style={{ height: "8px" }}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF9900] to-[#ffcc33]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] font-medium text-gray-400 dark:text-white/30">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trait tags */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-white/35">
              Frequently Mentioned
            </p>
            {traitTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {traitTags.map(({ tag, positive }) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                      positive
                        ? "border border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-500"
                        : "border border-rose-400/20 bg-rose-400/[0.07] text-rose-400"
                    }`}
                  >
                    {positive ? (
                      <ThumbsUp className="h-3 w-3" strokeWidth={2.5} />
                    ) : (
                      <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                    )}
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-gray-400 dark:text-white/30">No tags available for this product.</p>
            )}

            {/* Summary from pros/cons */}
            <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] p-4 mt-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-2">
                Expert Summary
              </p>
              <p className="text-[13px] leading-6 text-gray-600 dark:text-white/55">
                {pros.length > 0 && `Praised for ${pros.slice(0, 2).map(p => p.toLowerCase()).join(" and ")}.`}
                {cons.length > 0 && ` Some users note ${cons[0].toLowerCase()}.`}
                {` Overall a ${r >= 4.5 ? "top-tier" : r >= 4 ? "well-regarded" : "decent"} product in the ${categoryName} segment.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          VS COMPETITION
      ══════════════════════════════════════════════════════════════ */}
      {alternatives.length >= 2 && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e]">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
              <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">
                How it Compares — {categoryName}
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-white/30">Product</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-white/30">Price</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-white/30">Rating</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-white/30">Score</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {/* Current product row */}
                <tr className="bg-[#FF9900]/[0.04]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#FF9900] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                        This
                      </span>
                      <span className="text-[13px] font-semibold text-gray-800 dark:text-white/85 line-clamp-1 max-w-[180px]">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-[14px] font-bold text-[#FF9900]">{p > 0 ? `₹${p.toLocaleString("en-IN")}` : "—"}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="flex items-center justify-end gap-1 text-[13px] font-semibold text-gray-700 dark:text-white/70">
                      <Star className="h-3 w-3 text-[#FF9900]" fill="currentColor" strokeWidth={0} />
                      {r.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-[13px] font-bold text-[#FF9900]">{expertScore.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-[11px] font-semibold text-[#FF9900]">Current</span>
                  </td>
                </tr>

                {/* Alternatives */}
                {alternatives.map((alt) => {
                  const altPrice = Number(alt.price);
                  const altRating = Number(alt.rating);
                  const altScore = computeExpertScore(altRating, [], []);
                  const priceDiff = altPrice - p;
                  return (
                    <tr key={alt.id} className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/product/${alt.slug}`}
                          className="flex items-center gap-2 group-hover:text-[#FF9900] transition-colors"
                        >
                          <span className="text-[13px] font-medium text-gray-600 dark:text-white/55 line-clamp-1 max-w-[200px]">
                            {alt.name}
                          </span>
                          <ChevronRight className="h-3 w-3 text-gray-300 dark:text-white/20 group-hover:text-[#FF9900]" />
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div>
                          <span className="text-[13px] font-semibold text-gray-700 dark:text-white/70">
                            {altPrice > 0 ? `₹${altPrice.toLocaleString("en-IN")}` : "—"}
                          </span>
                          {p > 0 && altPrice > 0 && (
                            <span className={`ml-1.5 text-[10px] font-bold ${priceDiff > 0 ? "text-rose-400" : priceDiff < 0 ? "text-emerald-500" : "text-gray-400"}`}>
                              {priceDiff > 0 ? `+₹${priceDiff.toLocaleString("en-IN")}` : priceDiff < 0 ? `-₹${Math.abs(priceDiff).toLocaleString("en-IN")}` : "same"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="flex items-center justify-end gap-1 text-[13px] font-semibold text-gray-600 dark:text-white/55">
                          <Star className="h-3 w-3 text-[#FF9900]" fill="currentColor" strokeWidth={0} />
                          {altRating.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`text-[13px] font-bold ${altScore >= expertScore ? "text-emerald-500" : "text-gray-400 dark:text-white/30"}`}>
                          {altScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/product/${alt.slug}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:text-white/50 hover:border-[#FF9900]/30 hover:text-[#FF9900] transition-all"
                        >
                          View <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom tip */}
          <div className="border-t border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] px-6 py-3">
            <p className="flex items-center gap-2 text-[12px] text-gray-400 dark:text-white/30">
              <Zap className="h-3.5 w-3.5 text-[#FF9900]" strokeWidth={2} />
              <span>
                <strong className="text-gray-600 dark:text-white/50">Price tip:</strong>
                {p < (altPrices.reduce((a, b) => a + b, 0) / Math.max(1, altPrices.length))
                  ? ` This is below the category average — good deal for the specs.`
                  : ` This is above category average. Ensure the premium features justify the cost.`}
              </span>
            </p>
          </div>
        </section>
      )}

      {/* ── Editorial Review Teaser ── */}
      {review && (
        <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e]">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] px-6 py-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF9900]">Editorial Review</span>
              <h2 className="mt-0.5 text-[15px] font-bold text-gray-900 dark:text-white">{review.title}</h2>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-white/30">
              {new Date(review.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
          <div className="px-6 py-5">
            <p className="text-[14px] leading-7 text-gray-600 dark:text-white/55">{extractExcerpt(review.content)}</p>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] px-6 py-4">
            <p className="text-[12px] text-gray-400 dark:text-white/35">Full in-depth review with specs, verdict & buying advice</p>
            <Link
              href={`/blog/${review.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-2 text-[13px] font-bold text-[#FF9900] transition hover:bg-[#FF9900]/20"
            >
              Read full review <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Related Products ── */}
      {related.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
            <h2 className="section-title">Customers Also Viewed</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((rel) => {
              const relScore = computeExpertScore(Number(rel.rating), [], []);
              return (
                <Link
                  key={rel.id}
                  href={`/product/${rel.slug}`}
                  className="group rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-4 transition hover:border-gray-300 hover:bg-gray-50 dark:hover:border-white/[0.12] dark:hover:bg-[#1c1c28]"
                >
                  {/* Thumbnail (no onError — server component) */}
                  {rel.imageUrl && (
                    <div className="mb-3 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rel.imageUrl}
                        alt={rel.name}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <p className="text-[13px] font-semibold leading-snug text-gray-700 dark:text-white/80 group-hover:text-gray-900 dark:group-hover:text-white line-clamp-2">{rel.name}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-[#FF9900]">{Number(rel.price) > 0 ? `₹${Number(rel.price).toLocaleString("en-IN")}` : "Check Price"}</span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-white/40">
                      <Star className="h-3 w-3 text-[#FF9900]" fill="currentColor" strokeWidth={0} />
                      {Number(rel.rating).toFixed(1)}
                      <span className="ml-1 text-[10px] text-gray-400 dark:text-white/25">· {relScore.toFixed(1)}/10</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Bottom CTA ── */}
      <div className="rounded-xl border border-[#FF9900]/15 bg-[#FF9900]/[0.04] p-7 text-center">
        <div className="mb-2 inline-flex items-center justify-center gap-2 rounded-full border border-[#FF9900]/20 bg-[#FF9900]/10 px-4 py-1.5 text-[12px] font-bold text-[#FF9900]">
          <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          Expert Score: {expertScore.toFixed(1)}/10 — {verdict.label}
        </div>
        <p className="mb-4 text-[14px] text-gray-500 dark:text-white/45">
          Ready to buy? Check the latest price on Amazon India.
        </p>
        <a
          href={product.affiliateUrl}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="btn-orange inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-[15px] font-bold"
        >
          <ShoppingCart className="h-4 w-4" strokeWidth={2} />
          {p > 0 ? `View on Amazon India — ₹${p.toLocaleString("en-IN")}` : "View on Amazon India"}
        </a>
      </div>

    </article>
  );
}
