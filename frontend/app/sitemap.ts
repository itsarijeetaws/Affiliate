import { apiFetch } from "@/lib/api";
import type { MetadataRoute } from "next";

const SITE_URL = "https://whitesmoke-lapwing-348992.hostingersite.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 }
  ];

  try {
    // Products
    const products = await apiFetch<{ items: Array<{ slug: string; updatedAt: string }> }>("/products?limit=200");
    for (const p of products.items) {
      entries.push({
        url: `${SITE_URL}/product/${p.slug}`,
        lastModified: new Date(p.updatedAt),
        changeFrequency: "weekly",
        priority: 0.8
      });
    }
  } catch { /* no products yet */ }

  try {
    // Blog posts
    const posts = await apiFetch<{ items: Array<{ slug: string; createdAt: string }> }>("/blog?limit=200");
    for (const post of posts.items) {
      entries.push({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: new Date(post.createdAt),
        changeFrequency: "monthly",
        priority: 0.7
      });
    }
  } catch { /* no posts yet */ }

  return entries;
}
