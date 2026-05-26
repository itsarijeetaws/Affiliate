import { env } from "../config/env.js";
import { cacheClient } from "../lib/redis.js";

export type AmazonProduct = {
  asin: string;
  title: string;
  price: number;
  rating: number;
  imageUrl: string;
  features: string[];
  affiliateUrl: string;
  availability: string;
};

// ─── OAuth2 token (in-memory cache) ──────────────────────────────────────────
// Credential v3.2 → EU region → token endpoint: api.amazon.co.uk/auth/o2/token
// India (IN) is in the EU region for Creators API v3.x credentials.

const TOKEN_ENDPOINT = "https://api.amazon.co.uk/auth/o2/token";
const CREATORS_API_BASE = "https://creatorsapi.amazon";
const MARKETPLACE = "www.amazon.in";

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

  // v3.x credentials use JSON body (not URL-encoded)
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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

// ─── Creators API getItems ────────────────────────────────────────────────────

type CreatorsItem = {
  asin: string;
  detailPageURL: string;
  itemInfo?: {
    title?: { displayValue: string };
    features?: { displayValues: string[] };
  };
  images?: {
    primary?: {
      large?: { url: string; height: number; width: number } | null;
      medium?: { url: string } | null;
    } | null;
  };
  offersV2?: {
    listings?: Array<{
      price?: { amount: number; currency: string };
      availability?: { message: string };
    }>;
  } | null;
  customerReviews?: {
    starRating?: { value: number } | null;
  } | null;
};

async function creatorsApiRequest(itemIds: string[]): Promise<AmazonProduct[]> {
  const status = getAmazonIntegrationStatus();
  if (!status.configured) {
    throw new Error(`Amazon not configured. Missing: ${status.missing.join(", ")}`);
  }

  const token = await getAccessToken();
  const partnerTag = env.amazonPartnerTag as string;

  const body = JSON.stringify({
    itemIds,
    itemIdType: "ASIN",
    marketplace: MARKETPLACE,
    partnerTag,
    resources: [
      "images.primary.large",
      "images.primary.medium",
      "itemInfo.title",
      "itemInfo.features",
      "offersV2.listings.price",
      "offersV2.listings.availability",
      "customerReviews.starRating",
      "customerReviews.count",
    ],
  });

  const res = await fetch(`${CREATORS_API_BASE}/catalog/v1/getItems`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-marketplace": MARKETPLACE,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    _tokenCache = null; // bust token cache on auth errors
    throw new Error(`Creators API error ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    itemsResult?: { items: CreatorsItem[] };
  };

  return (data.itemsResult?.items ?? []).map((item) => {
    const listing = item.offersV2?.listings?.[0];
    const imgLarge = item.images?.primary?.large?.url ?? "";
    const imgMed   = item.images?.primary?.medium?.url ?? "";
    return {
      asin: item.asin,
      title: item.itemInfo?.title?.displayValue ?? item.asin,
      price: listing?.price?.amount ?? 0,
      rating: item.customerReviews?.starRating?.value ?? 0,
      imageUrl: imgLarge || imgMed,
      features: item.itemInfo?.features?.displayValues ?? [],
      affiliateUrl: item.detailPageURL,
      availability: listing?.availability?.message ?? "Available",
    };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchProductByASIN(asin: string): Promise<AmazonProduct | null> {
  const key = `amazon:asin:${asin}`;
  const cached = await cacheClient.get(key);
  if (cached) return JSON.parse(cached) as AmazonProduct;

  try {
    const results = await creatorsApiRequest([asin]);
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

  // Creators API — batch limit TBC, using 10 to be safe
  const chunks: string[][] = [];
  for (let i = 0; i < asins.length; i += 10) {
    chunks.push(asins.slice(i, i + 10));
  }

  const results: AmazonProduct[] = [];
  for (const chunk of chunks) {
    try {
      const items = await creatorsApiRequest(chunk);
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
