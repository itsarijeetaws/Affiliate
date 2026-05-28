import { env } from "../config/env.js";
import { cacheClient } from "../lib/redis.js";

export type AmazonProduct = {
  asin: string;
  title: string;
  price: number;
  mrp: number;           // 0 if no discount / not available
  rating: number;
  reviewCount: number;
  imageUrl: string;
  features: string[];
  affiliateUrl: string;
  availability: string;
};

// ─── OAuth2 token (in-memory cache) ──────────────────────────────────────────
// Credential v3.2 → EU region → token endpoint: api.amazon.co.uk/auth/o2/token
// India (IN) is in the EU region for Creators API v3.x credentials.
// NOTE: token endpoint requires form-encoded body (not JSON)

const TOKEN_ENDPOINT = "https://api.amazon.co.uk/auth/o2/token";
const CREATORS_API_BASE = "https://creatorsapi.amazon";
const MARKETPLACE = "www.amazon.in";

// Confirmed valid resources (from ValidationException response 2026-05-28)
const PRODUCT_RESOURCES = [
  "itemInfo.title",
  "itemInfo.features",
  "images.primary.large",
  "images.primary.medium",
  "offersV2.listings.price",
  "offersV2.listings.dealDetails",   // contains MRP / savings
  "offersV2.listings.availability",
  "offersV2.listings.isBuyBoxWinner",
  "customerReviews.starRating",
  "customerReviews.count",
];

let _tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.token;
  }

  const clientId = env.amazonClientId;
  const clientSecret = env.amazonClientSecret;
  if (!clientId || !clientSecret) {
    throw new Error("AMAZON_CLIENT_ID or AMAZON_CLIENT_SECRET not set in .env");
  }

  // IMPORTANT: token endpoint requires application/x-www-form-urlencoded (not JSON)
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "creatorsapi::default",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Creators API OAuth2 token error ${res.status}: ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  _tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  console.log("[Creators API] New token obtained, expires in", data.expires_in, "s");
  return data.access_token;
}

// ─── Integration status ───────────────────────────────────────────────────────

export function getAmazonIntegrationStatus() {
  const missing: string[] = [];
  if (!env.amazonClientId)     missing.push("AMAZON_CLIENT_ID");
  if (!env.amazonClientSecret) missing.push("AMAZON_CLIENT_SECRET");
  if (!env.amazonPartnerTag)   missing.push("AMAZON_PARTNER_TAG");
  return { configured: missing.length === 0, missing };
}

// ─── Shared response types ────────────────────────────────────────────────────

type CreatorsItem = {
  asin: string;
  detailPageURL?: string;
  itemInfo?: {
    title?: { displayValue: string };
    features?: { displayValues: string[] };
  };
  images?: {
    primary?: {
      large?:  { url: string } | null;
      medium?: { url: string } | null;
    } | null;
  };
  offersV2?: {
    listings?: Array<{
      price?: { amount: number; currency: string };
      dealDetails?: {
        savingsAmount?: number;
        savingsPercentage?: number;
        basisPrice?: { amount: number };
      } | null;
      availability?: { message: string };
      isBuyBoxWinner?: boolean;
    }>;
  } | null;
  customerReviews?: {
    starRating?: { value: number } | null;
    count?: { displayValue: number } | null;
  } | null;
};

function mapItem(item: CreatorsItem, partnerTag: string): AmazonProduct {
  // Prefer buybox listing, fall back to first listing
  const listings = item.offersV2?.listings ?? [];
  const listing = listings.find(l => l.isBuyBoxWinner) ?? listings[0];

  const price = listing?.price?.amount ?? 0;

  // MRP = basisPrice from dealDetails (original / strikethrough price)
  const basisPrice = listing?.dealDetails?.basisPrice?.amount ?? 0;
  const mrp = basisPrice > price ? basisPrice : 0;

  const imgUrl =
    item.images?.primary?.large?.url ??
    item.images?.primary?.medium?.url ?? "";

  const affiliateUrl = item.detailPageURL
    ? item.detailPageURL.includes("tag=")
      ? item.detailPageURL
      : `${item.detailPageURL}${item.detailPageURL.includes("?") ? "&" : "?"}tag=${partnerTag}`
    : `https://www.amazon.in/dp/${item.asin}/?tag=${partnerTag}`;

  return {
    asin: item.asin,
    title: item.itemInfo?.title?.displayValue ?? item.asin,
    price,
    mrp,
    rating: item.customerReviews?.starRating?.value ?? 0,
    reviewCount: item.customerReviews?.count?.displayValue ?? 0,
    imageUrl: imgUrl,
    features: item.itemInfo?.features?.displayValues ?? [],
    affiliateUrl,
    availability: listing?.availability?.message ?? "Available",
  };
}

// ─── getItems (by ASIN list) ──────────────────────────────────────────────────

async function creatorsGetItems(itemIds: string[]): Promise<AmazonProduct[]> {
  const status = getAmazonIntegrationStatus();
  if (!status.configured) {
    throw new Error(`Amazon not configured. Missing: ${status.missing.join(", ")}`);
  }

  const token = await getAccessToken();
  const partnerTag = env.amazonPartnerTag as string;

  const res = await fetch(`${CREATORS_API_BASE}/catalog/v1/getItems`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-marketplace": MARKETPLACE,
    },
    body: JSON.stringify({
      itemIds,
      itemIdType: "ASIN",
      marketplace: MARKETPLACE,
      partnerTag,
      resources: PRODUCT_RESOURCES,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    _tokenCache = null; // bust cache on auth errors
    throw new Error(`Creators API getItems error ${res.status}: ${text}`);
  }

  const data = await res.json() as { itemsResult?: { items: CreatorsItem[] } };
  return (data.itemsResult?.items ?? []).map(item => mapItem(item, partnerTag));
}

// ─── searchItems (by keyword) ─────────────────────────────────────────────────

export async function searchAmazonProducts(
  keywords: string,
  opts: { searchIndex?: string; itemCount?: number } = {}
): Promise<AmazonProduct[]> {
  const status = getAmazonIntegrationStatus();
  if (!status.configured) {
    throw new Error(`Amazon not configured. Missing: ${status.missing.join(", ")}`);
  }

  const token = await getAccessToken();
  const partnerTag = env.amazonPartnerTag as string;

  const res = await fetch(`${CREATORS_API_BASE}/catalog/v1/searchItems`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-marketplace": MARKETPLACE,
    },
    body: JSON.stringify({
      keywords,
      searchIndex: opts.searchIndex ?? "All",
      itemCount: Math.min(opts.itemCount ?? 10, 10),
      marketplace: MARKETPLACE,
      partnerTag,
      resources: PRODUCT_RESOURCES,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    _tokenCache = null;
    throw new Error(`Creators API searchItems error ${res.status}: ${text}`);
  }

  const data = await res.json() as { searchResult?: { items: CreatorsItem[] } };
  return (data.searchResult?.items ?? []).map(item => mapItem(item, partnerTag));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchProductByASIN(asin: string): Promise<AmazonProduct | null> {
  const key = `amazon:asin:${asin}`;
  const cached = await cacheClient.get(key);
  if (cached) return JSON.parse(cached) as AmazonProduct;

  try {
    const results = await creatorsGetItems([asin]);
    if (results.length > 0) {
      await cacheClient.setEx(key, 3600, JSON.stringify(results[0]));
      return results[0];
    }
  } catch (err) {
    console.error("[Amazon] fetchProductByASIN failed:", String(err));
  }

  return null;
}

export async function fetchBatchByASINs(asins: string[]): Promise<AmazonProduct[]> {
  const status = getAmazonIntegrationStatus();
  if (!status.configured) {
    throw new Error(`Amazon not configured. Missing: ${status.missing.join(", ")}`);
  }

  // Batch in chunks of 10 (safe limit)
  const chunks: string[][] = [];
  for (let i = 0; i < asins.length; i += 10) {
    chunks.push(asins.slice(i, i + 10));
  }

  const results: AmazonProduct[] = [];
  for (const chunk of chunks) {
    try {
      const items = await creatorsGetItems(chunk);
      for (const item of items) {
        await cacheClient.setEx(`amazon:asin:${item.asin}`, 3600, JSON.stringify(item));
      }
      results.push(...items);
    } catch (err) {
      console.error("[Amazon] batch chunk failed:", String(err));
      throw err;
    }
  }

  return results;
}

export async function updateProductPrice(asin: string): Promise<number | null> {
  await cacheClient.del(`amazon:asin:${asin}`);
  const product = await fetchProductByASIN(asin);
  return product?.price ?? null;
}

/** Build standard Amazon.in affiliate URL */
export function buildAffiliateUrl(asin: string): string {
  const tag = env.amazonPartnerTag ?? "adfirststore-21";
  return `https://www.amazon.in/dp/${asin}/?tag=${tag}`;
}
