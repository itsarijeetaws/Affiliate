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
};

function cacheKey(key: string): string {
  return `amazon:${key}`;
}

// Placeholder signature builder. Replace endpoint + canonical request with PA API spec before production.
function buildSignature(payload: string): string {
  return crypto
    .createHmac("sha256", env.amazonSecretKey || "")
    .update(payload)
    .digest("hex");
}

export async function fetchProductByASIN(asin: string): Promise<AmazonProduct | null> {
  const key = cacheKey(`asin:${asin}`);
  const cached = await cacheClient.get(key);
  if (cached) {
    return JSON.parse(cached) as AmazonProduct;
  }

  if (!env.amazonAccessKey || !env.amazonSecretKey || !env.amazonPartnerTag) {
    return null;
  }

  const mock: AmazonProduct = {
    asin,
    title: `Sample Product ${asin}`,
    price: 99.99,
    rating: 4.4,
    imageUrl: "https://images-na.ssl-images-amazon.com/images/I/sample.jpg",
    features: ["Feature 1", "Feature 2"],
    affiliateUrl: `https://www.amazon.com/dp/${asin}/?tag=${env.amazonPartnerTag}`
  };

  const payload = JSON.stringify({ asin, region: env.amazonRegion });
  void buildSignature(payload);

  await cacheClient.setEx(key, 3600, JSON.stringify(mock));
  return mock;
}

export async function searchProductsByKeyword(keyword: string): Promise<AmazonProduct[]> {
  const key = cacheKey(`search:${keyword.toLowerCase()}`);
  const cached = await cacheClient.get(key);
  if (cached) {
    return JSON.parse(cached) as AmazonProduct[];
  }

  const results = [
    {
      asin: "B000000001",
      title: `${keyword} Pro Model`,
      price: 129.99,
      rating: 4.5,
      imageUrl: "https://images-na.ssl-images-amazon.com/images/I/sample1.jpg",
      features: ["Pro feature", "Compact"],
      affiliateUrl: `https://www.amazon.com/dp/B000000001/?tag=${env.amazonPartnerTag || "tag"}`
    }
  ];

  await cacheClient.setEx(key, 1800, JSON.stringify(results));
  return results;
}

export async function updateProductPrice(asin: string): Promise<number | null> {
  const product = await fetchProductByASIN(asin);
  return product?.price ?? null;
}

export async function getProductImages(asin: string): Promise<string[]> {
  const product = await fetchProductByASIN(asin);
  return product ? [product.imageUrl] : [];
}
