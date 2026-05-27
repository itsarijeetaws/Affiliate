import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Internal API — must match api.ts default port (4000)
const INTERNAL_API =
  process.env.INTERNAL_API_URL ||
  `http://127.0.0.1:${process.env.PORT ?? "4000"}`;

async function safeFetch<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${INTERNAL_API}${path}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL,                        lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${SITE_URL}/blog`,              lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${SITE_URL}/compare`,           lastModified: now, changeFrequency: "weekly",  priority: 0.75 },
    { url: `${SITE_URL}/search`,            lastModified: now, changeFrequency: "daily",   priority: 0.7 },
    { url: `${SITE_URL}/about`,             lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/contact`,           lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/disclosure`,        lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${SITE_URL}/privacy`,           lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
  ];

  // Categories + top-N pages
  // /categories returns a plain array (not {items:[]})
  const categories = await safeFetch<Array<{ slug: string; updatedAt?: string }>>("/categories");
  for (const cat of categories ?? []) {
    entries.push({
      url: `${SITE_URL}/category/${cat.slug}`,
      lastModified: cat.updatedAt ? new Date(cat.updatedAt) : now,
      changeFrequency: "daily",
      priority: 0.85,
    });
    entries.push({
      url: `${SITE_URL}/top/${cat.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  // Products — fetch up to 2000 (covers current ~1200+ catalog)
  const products = await safeFetch<{
    items: Array<{ slug: string; updatedAt: string }>;
  }>("/products?limit=2000");
  for (const p of products?.items ?? []) {
    entries.push({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Blog posts
  const posts = await safeFetch<{
    items: Array<{ slug: string; createdAt: string }>;
  }>("/api/blog?limit=1000");
  for (const post of posts?.items ?? []) {
    entries.push({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.createdAt),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
