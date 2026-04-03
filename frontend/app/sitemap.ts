import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic"; // never build at compile time — generate per-request

const SITE_URL = "https://whitesmoke-lapwing-348992.hostingersite.com";
const INTERNAL_API = process.env.INTERNAL_API_URL || `http://127.0.0.1:${process.env.PORT ?? "4000"}`;

async function safeFetch<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000); // 8s timeout
  try {
    const res = await fetch(`${INTERNAL_API}${path}`, { signal: controller.signal });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 }
  ];

  const products = await safeFetch<{ items: Array<{ slug: string; updatedAt: string }> }>("/products?limit=200");
  for (const p of products?.items ?? []) {
    entries.push({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8
    });
  }

  const posts = await safeFetch<{ items: Array<{ slug: string; createdAt: string }> }>("/api/blog?limit=200");
  for (const post of posts?.items ?? []) {
    entries.push({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.createdAt),
      changeFrequency: "monthly",
      priority: 0.7
    });
  }

  return entries;
}
