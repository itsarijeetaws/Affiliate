import crypto from "crypto";
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

export function getAmazonIntegrationStatus() {
  const missing: string[] = [];

  if (!env.amazonAccessKey) missing.push("AMAZON_ACCESS_KEY");
  if (!env.amazonSecretKey) missing.push("AMAZON_SECRET_KEY");
  if (!env.amazonPartnerTag) missing.push("AMAZON_PARTNER_TAG");

  return {
    configured: missing.length === 0,
    missing
  };
}

// ─── PA API v5 — AWS Signature V4 ─────────────────────────────────────────────

const PA_API_HOST = "webservices.amazon.in";
const PA_API_PATH = "/paapi5/getitems";
const PA_API_REGION = "us-east-1"; // PA API India uses us-east-1 endpoint

function sign(key: Buffer, msg: string): Buffer {
  return crypto.createHmac("sha256", key).update(msg).digest();
}

function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = sign(Buffer.from(`AWS4${secretKey}`), dateStamp);
  const kRegion = sign(kDate, region);
  const kService = sign(kRegion, service);
  return sign(kService, "aws4_request");
}

async function paApiRequest(itemIds: string[]): Promise<AmazonProduct[]> {
  const status = getAmazonIntegrationStatus();
  if (!status.configured) {
    throw new Error(`Amazon PA API is not configured. Missing: ${status.missing.join(", ")}`);
  }

  const amazonAccessKey = env.amazonAccessKey as string;
  const amazonSecretKey = env.amazonSecretKey as string;
  const amazonPartnerTag = env.amazonPartnerTag as string;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").substring(0, 15) + "Z";
  const dateStamp = amzDate.substring(0, 8);

  const payload = JSON.stringify({
    ItemIds: itemIds,
    PartnerTag: amazonPartnerTag,
    PartnerType: "Associates",
    Marketplace: "www.amazon.in",
    Resources: [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "ItemInfo.Features",
      "Offers.Listings.Price",
      "Offers.Listings.Availability.Message",
      "CustomerReviews.StarRating"
    ]
  });

  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${PA_API_HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = [
    "POST",
    PA_API_PATH,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");

  const credentialScope = `${dateStamp}/${PA_API_REGION}/ProductAdvertisingAPI/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex")
  ].join("\n");

  const signingKey = getSignatureKey(amazonSecretKey, dateStamp, PA_API_REGION, "ProductAdvertisingAPI");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${amazonAccessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${PA_API_HOST}${PA_API_PATH}`, {
    method: "POST",
    headers: {
      "content-encoding": "amz-1.0",
      "content-type": "application/json; charset=utf-8",
      host: PA_API_HOST,
      "x-amz-date": amzDate,
      "x-amz-target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems",
      Authorization: authHeader
    },
    body: payload
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PA API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    ItemsResult?: {
      Items: Array<{
        ASIN: string;
        ItemInfo?: { Title?: { DisplayValue: string }; Features?: { DisplayValues: string[] } };
        Images?: { Primary?: { Large?: { URL: string } } };
        Offers?: { Listings?: Array<{ Price?: { Amount: number }; Availability?: { Message: string } }> };
        CustomerReviews?: { StarRating?: { Value: number } };
        DetailPageURL: string;
      }>;
    };
  };

  return (data.ItemsResult?.Items ?? []).map((item) => {
    const listing = item.Offers?.Listings?.[0];
    return {
      asin: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue ?? item.ASIN,
      price: listing?.Price?.Amount ?? 0,
      rating: item.CustomerReviews?.StarRating?.Value ?? 0,
      imageUrl: item.Images?.Primary?.Large?.URL ?? "",
      features: item.ItemInfo?.Features?.DisplayValues ?? [],
      affiliateUrl: item.DetailPageURL,
      availability: listing?.Availability?.Message ?? "Available"
    };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchProductByASIN(asin: string): Promise<AmazonProduct | null> {
  const key = `amazon:asin:${asin}`;
  const cached = await cacheClient.get(key);
  if (cached) return JSON.parse(cached) as AmazonProduct;

  try {
    const results = await paApiRequest([asin]);
    if (results.length > 0) {
      await cacheClient.setEx(key, 3600, JSON.stringify(results[0]));
      return results[0];
    }
  } catch {
    // PA API unavailable — caller handles manual fallback
  }

  return null;
}

export async function fetchBatchByASINs(asins: string[]): Promise<AmazonProduct[]> {
  const status = getAmazonIntegrationStatus();
  if (!status.configured) {
    throw new Error(`Amazon PA API is not configured. Missing: ${status.missing.join(", ")}`);
  }

  // PA API batches max 10
  const chunks: string[][] = [];
  for (let i = 0; i < asins.length; i += 10) {
    chunks.push(asins.slice(i, i + 10));
  }

  const results: AmazonProduct[] = [];
  for (const chunk of chunks) {
    try {
      const items = await paApiRequest(chunk);
      for (const item of items) {
        await cacheClient.setEx(`amazon:asin:${item.asin}`, 3600, JSON.stringify(item));
      }
      results.push(...items);
    } catch {
      // skip failed chunks, continue
    }
  }

  return results;
}

export async function updateProductPrice(asin: string): Promise<number | null> {
  // Invalidate cache to force fresh fetch
  await cacheClient.setEx(`amazon:asin:${asin}`, 1, "{}");
  const product = await fetchProductByASIN(asin);
  return product?.price ?? null;
}

/** Build a standard Amazon.in affiliate URL from an ASIN + partner tag */
export function buildAffiliateUrl(asin: string): string {
  const tag = env.amazonPartnerTag ?? "adfirststore-21";
  return `https://www.amazon.in/dp/${asin}/?tag=${tag}`;
}
