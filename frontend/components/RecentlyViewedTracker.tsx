"use client";

import { useEffect } from "react";

export type RecentlyViewedItem = {
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  amazonAsin?: string;
  rating: number;
};

const KEY = "bbiRecentlyViewed";
const MAX = 6;

export function RecentlyViewedTracker({
  slug, name, price, imageUrl, amazonAsin, rating,
}: RecentlyViewedItem) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const prev: RecentlyViewedItem[] = raw ? (JSON.parse(raw) as RecentlyViewedItem[]) : [];
      const next: RecentlyViewedItem[] = [
        { slug, name, price, imageUrl, amazonAsin, rating },
        ...prev.filter((x) => x.slug !== slug),
      ].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable (private browsing, storage quota, etc.)
    }
  }, [slug, name, price, imageUrl, amazonAsin, rating]);

  return null;
}
