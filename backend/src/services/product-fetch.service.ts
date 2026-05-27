/**
 * Amazon product data fetcher.
 *
 * Strategy (in order):
 *   1. Amazon Creators API  — authoritative, used when credentials are configured & eligible
 *   2. Amazon product page  — JSON-LD Product schema (server-rendered for SEO)
 *   3. Open Graph / meta tags
 *   4. DOM class/ID patterns
 *
 * Returns null only if all strategies fail (CAPTCHA block, invalid ASIN, etc.)
 */

import axios from "axios";
import { fetchProductByASIN } from "./amazon.service.js";
import { env } from "../config/env.js";

export interface FetchedProduct {
  asin: string;
  title: string;
  price: number;
  mrp: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  images: string[];
  affiliateUrl: string;
  features: string[];
  availability: string;
  brand: string;
  source: "creators-api" | "json-ld" | "og-tags" | "dom";
}

// ─── User-Agent pool ──────────────────────────────────────────────────────────

const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];
const pickUA = () => UAS[Math.floor(Math.random() * UAS.length)];

function buildHeaders(referer?: string) {
  return {
    "User-Agent": pickUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    ...(referer ? { "Referer": referer } : {}),
  };
}

// ─── CAPTCHA / bot-check detection ───────────────────────────────────────────

function isBlocked(html: string): boolean {
  return (
    html.includes("api-services-support@amazon.com") ||
    html.includes("automated access") ||
    html.includes("Enter the characters you see") ||
    html.includes("Type the characters you see in this image") ||
    html.length < 5000
  );
}

// ─── JSON-LD extraction ───────────────────────────────────────────────────────

function extractJsonLd(html: string): Partial<FetchedProduct> | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const nodes: unknown[] = Array.isArray(data)
        ? data
        : data["@graph"] ? (data["@graph"] as unknown[])
        : [data];

      for (const node of nodes) {
        const n = node as Record<string, unknown>;
        if (n["@type"] !== "Product" && n["@type"] !== "IndividualProduct") continue;

        const title = (n.name as string) ?? "";
        if (!title || title.length < 5) continue;

        // Price from offers
        let price = 0;
        let mrp = 0;
        const offers = n.offers as Record<string, unknown> | undefined;
        if (offers) {
          price = parseFloat(String(offers.price ?? offers.lowPrice ?? "0").replace(/,/g, "")) || 0;
          mrp   = parseFloat(String(offers.highPrice ?? offers.price ?? "0").replace(/,/g, "")) || 0;
        }

        // Rating
        const agg = n.aggregateRating as Record<string, unknown> | undefined;
        const rating = agg ? parseFloat(String(agg.ratingValue ?? "0")) : 0;
        const reviewCount = agg ? parseInt(String(agg.reviewCount ?? agg.ratingCount ?? "0"), 10) : 0;

        // Brand
        const brandObj = n.brand as Record<string, unknown> | undefined;
        const brand = (brandObj?.name as string) ?? (n.brand as string) ?? "";

        // Image
        const imgRaw = n.image;
        let imageUrl = "";
        if (typeof imgRaw === "string") imageUrl = imgRaw;
        else if (Array.isArray(imgRaw)) imageUrl = (imgRaw[0] as string) ?? "";
        else if (imgRaw && typeof imgRaw === "object") imageUrl = (imgRaw as Record<string, string>).url ?? "";

        return { title, price, mrp, rating, reviewCount, brand, imageUrl, source: "json-ld" };
      }
    } catch { /* bad JSON, continue */ }
  }
  return null;
}

// ─── Open Graph / meta extraction ─────────────────────────────────────────────

function extractMeta(html: string): Partial<FetchedProduct> {
  const meta = (name: string): string => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
    const m2 = re.exec(html) ?? new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i").exec(html);
    return m2?.[1]?.trim() ?? "";
  };

  const title   = meta("og:title") || meta("title") || "";
  const imageUrl = meta("og:image") || "";
  const priceStr = meta("product:price:amount") || meta("og:price:amount") || "";
  const price    = parseFloat(priceStr.replace(/,/g, "")) || 0;

  return { title, imageUrl, price, source: "og-tags" };
}

// ─── DOM pattern extraction ───────────────────────────────────────────────────

function extractDom(html: string): Partial<FetchedProduct> {
  const tag = (id: string): string => {
    const re = new RegExp(`id=["']${id}["'][^>]*>\\s*([^<]{3,300})`, "i");
    return re.exec(html)?.[1]?.trim() ?? "";
  };

  // Title
  const title = tag("productTitle") || (() => {
    const m = /<span[^>]+class=["'][^"']*product-title-word-break[^"']*["'][^>]*>([\s\S]{5,200}?)<\/span>/i.exec(html);
    return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
  })();

  // Price
  let price = 0;
  const pricePatterns = [
    /class="a-price-whole"[^>]*>([\d,]+)/,
    /id="priceblock_ourprice"[^>]*>[^₹]*₹\s*([\d,]+)/,
    /id="priceblock_dealprice"[^>]*>[^₹]*₹\s*([\d,]+)/,
  ];
  for (const re of pricePatterns) {
    const m = re.exec(html);
    if (m) { price = parseFloat(m[1].replace(/,/g, "")); break; }
  }

  // Rating
  let rating = 0;
  const ratingM = /(\d+\.\d+) out of 5 stars/.exec(html);
  if (ratingM) rating = parseFloat(ratingM[1]);

  // Review count
  let reviewCount = 0;
  const rcM = /([\d,]+)\s+(?:global )?ratings/.exec(html);
  if (rcM) reviewCount = parseInt(rcM[1].replace(/,/g, ""), 10);

  // Brand
  const brandM = /(?:Visit the|Brand:|by)\s+<[^>]+>([A-Za-z0-9 &.'-]{2,40})<\/a>/i.exec(html) ??
                 /class="a-size-base-plus[^"]*"[^>]*>([A-Za-z0-9 &.'-]{2,40})<\/span>/i.exec(html);
  const brand = brandM?.[1]?.trim() ?? "";

  // Feature bullets
  const bulletsM = html.match(/<span class="a-list-item"[^>]*>([\s\S]{10,300}?)<\/span>/gi) ?? [];
  const features = bulletsM
    .map(b => b.replace(/<[^>]+>/g, "").trim())
    .filter(b => b.length > 10 && b.length < 250)
    .slice(0, 6);

  // Availability
  let availability = "Available";
  if (/currently unavailable/i.test(html) || /out of stock/i.test(html)) availability = "Out of Stock";
  else if (/in stock/i.test(html)) availability = "In Stock";

  // High-res image from data-old-hires or landingImage
  let imageUrl = "";
  const imgM = /id="landingImage"[^>]+data-old-hires="([^"]+)"/.exec(html) ??
               /id="imgBlkFront"[^>]+src="([^"]+)"/.exec(html);
  if (imgM) imageUrl = imgM[1];

  return { title, price, rating, reviewCount, brand, features, availability, imageUrl, source: "dom" };
}

// ─── Upgrade image to high-res ────────────────────────────────────────────────

function upgradeImage(url: string): string {
  if (!url) return url;
  // Convert thumbnail to high-res: remove size suffix → add ._SL1500_
  return url
    .replace(/\._[A-Z]{1,3}\d{2,4}(_[A-Z]+\d+)?_\./g, ".")
    .replace(/\.([a-z]+)$/, "._SL1500_.$1");
}

// ─── Main fetch function ──────────────────────────────────────────────────────

export async function fetchAmazonProduct(asin: string): Promise<FetchedProduct | null> {
  const partnerTag = env.amazonPartnerTag ?? "adfirststore-21";
  const affiliateUrl = `https://www.amazon.in/dp/${asin}/?tag=${partnerTag}`;

  // ── Strategy 1: Creators API ─────────────────────────────────────────────
  if (env.amazonClientId && env.amazonClientSecret) {
    try {
      const item = await fetchProductByASIN(asin);
      if (item && item.title && item.title !== asin) {
        return {
          asin,
          title: item.title,
          price: item.price,
          mrp: item.price,
          rating: item.rating,
          reviewCount: 0,
          imageUrl: upgradeImage(item.imageUrl),
          images: item.imageUrl ? [upgradeImage(item.imageUrl)] : [],
          affiliateUrl: item.affiliateUrl || affiliateUrl,
          features: item.features,
          availability: item.availability,
          brand: "",
          source: "creators-api",
        };
      }
    } catch { /* fall through */ }
  }

  // ── Strategy 2-4: Scraping (desktop + mobile) ────────────────────────────
  const urls = [
    `https://www.amazon.in/dp/${asin}`,
    `https://m.amazon.in/dp/${asin}`,
    `https://www.amazon.in/dp/${asin}?th=1&psc=1`,
  ];

  for (const url of urls) {
    try {
      const { data: html } = await axios.get<string>(url, {
        headers: buildHeaders(url.includes("m.amazon") ? undefined : "https://www.amazon.in/"),
        timeout: 20000,
        decompress: true,
        maxRedirects: 5,
      });

      if (isBlocked(html)) continue;

      // Merge strategies — prefer more reliable sources
      const jsonLd = extractJsonLd(html) ?? {};
      const og     = extractMeta(html);
      const dom    = extractDom(html);

      const title = jsonLd.title || dom.title || og.title || "";
      if (!title || title.length < 5) continue; // blocked/bad page

      const price  = jsonLd.price  || dom.price  || og.price  || 0;
      const mrp    = jsonLd.mrp    || price;
      const rating = jsonLd.rating || dom.rating  || 0;
      const reviewCount = jsonLd.reviewCount || dom.reviewCount || 0;
      const brand  = jsonLd.brand  || dom.brand   || "";
      const imageUrl = upgradeImage(jsonLd.imageUrl || dom.imageUrl || og.imageUrl || "");
      const features = dom.features?.length ? dom.features : jsonLd.features ?? [];
      const availability = dom.availability ?? "Available";
      const source = jsonLd.title ? "json-ld" : dom.title ? "dom" : "og-tags";

      return {
        asin,
        title,
        price,
        mrp,
        rating,
        reviewCount,
        imageUrl,
        images: imageUrl ? [imageUrl] : [],
        affiliateUrl,
        features,
        availability,
        brand,
        source: source as FetchedProduct["source"],
      };
    } catch { /* try next URL */ }
  }

  return null;
}
