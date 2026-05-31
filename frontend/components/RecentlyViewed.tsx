"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import type { RecentlyViewedItem } from "./RecentlyViewedTracker";

const KEY = "bbiRecentlyViewed";

type Props = {
  /** If provided, excludes this slug from the list (avoids showing current product to itself). */
  currentSlug?: string;
};

export function RecentlyViewed({ currentSlug }: Props) {
  // Initial state is always empty — populated in useEffect to avoid hydration mismatch.
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const all = JSON.parse(raw) as RecentlyViewedItem[];
      const filtered = currentSlug
        ? all.filter((x) => x.slug !== currentSlug)
        : all;
      setItems(filtered.slice(0, 6));
    } catch {
      // localStorage unavailable or parse error — stay empty
    }
  }, [currentSlug]);

  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
        <h2 className="section-title">Recently Viewed</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const p = Number(item.price);
          return (
            <Link
              key={item.slug}
              href={`/product/${item.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-3 transition hover:border-[#FF9900]/30 hover:bg-[#FF9900]/[0.02] dark:hover:border-[#FF9900]/20"
            >
              {item.imageUrl ? (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.04] text-gray-300 dark:text-white/20 text-[10px] font-bold uppercase tracking-wider">
                  ?
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-gray-700 dark:text-white/80 group-hover:text-gray-900 dark:group-hover:text-white">
                  {item.name}
                </p>
                <p className="mt-1 text-[13px] font-bold text-[#FF9900]">
                  {p > 0 ? `₹${p.toLocaleString("en-IN")}` : "Check Price"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
