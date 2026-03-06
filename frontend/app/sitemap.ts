import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.example.com";
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/blog`, priority: 0.8 },
    { url: `${base}/compare`, priority: 0.8 },
    { url: `${base}/search`, priority: 0.7 }
  ];
}
