"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, BadgeCheck, ShoppingCart } from "lucide-react";

type Props = {
  name: string;
  slug: string;
  imageUrl: string;
  amazonAsin?: string;
  price: number;
  mrp?: number | string | null;
  rating: number;
};

function buildImageUrl(imageUrl: string, amazonAsin?: string): string {
  // Prefer provided URL if it looks like a real CDN URL (not empty/placeholder)
  if (imageUrl && !imageUrl.includes("/sample.jpg")) return imageUrl;
  // Fallback: open Amazon CDN format (no hotlink protection)
  if (amazonAsin) return `https://m.media-amazon.com/images/P/${amazonAsin}._SL500_.jpg`;
  return "";
}

function hasValidImage(imageUrl: string): boolean {
  return Boolean(imageUrl) && !imageUrl.includes("/sample.jpg");
}

function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(Number(rating));
  return (
    <span className="flex items-center gap-[2px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-[12px] w-[12px] ${i < filled ? "star-filled" : "star-empty"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function getBadge(rating: number) {
  const r = Number(rating);
  if (r >= 4.5) return "seller";
  if (r >= 4.0) return "rated";
  return null;
}

export function ProductCard({ name, slug, imageUrl, amazonAsin, price, mrp, rating }: Props) {
  const [imgSrc, setImgSrc] = useState(() => buildImageUrl(imageUrl, amazonAsin));
  const [imgError, setImgError] = useState(false);
  const showImage = hasValidImage(imgSrc) && !imgError;
  const badge = getBadge(rating);
  const r = Number(rating);
  const p = Number(price);
  const m = Number(mrp ?? 0);
  const discount = m > p && p > 0 ? Math.round(((m - p) / m) * 100) : 0;

  function handleImgError() {
    // Try ASIN-based /P/ fallback before giving up
    const fallback = amazonAsin ? `https://m.media-amazon.com/images/P/${amazonAsin}._SL500_.jpg` : "";
    if (fallback && imgSrc !== fallback) {
      setImgSrc(fallback);
    } else {
      setImgError(true);
    }
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] dark:border-white/[0.07] dark:bg-[#16161e] dark:hover:border-[#FF9900]/20 dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,153,0,0.08)]">

      {/* Badges */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
        {discount >= 5 && (
          <span className="badge-deal">
            {discount}% off
          </span>
        )}
        {badge && !discount && (
          badge === "seller" ? (
            <span className="badge-seller inline-flex items-center gap-1">
              <Award className="h-2.5 w-2.5" strokeWidth={2.5} />
              Best Seller
            </span>
          ) : (
            <span className="badge-rated inline-flex items-center gap-1">
              <BadgeCheck className="h-2.5 w-2.5" strokeWidth={2.5} />
              Top Rated
            </span>
          )
        )}
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 dark:bg-[#0f0f18]">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={name}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="h-full w-full object-contain px-6 py-5 transition-transform duration-300 group-hover:scale-[1.04]"
            onError={handleImgError}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF9900]/10 text-[#FF9900]">
              <ShoppingCart className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <span className="px-4 text-center text-[10px] font-medium uppercase tracking-widest text-gray-300 dark:text-white/20 line-clamp-2">
              {name}
            </span>
          </div>
        )}
        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-50 to-transparent dark:from-[#16161e]" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-gray-800 transition-colors group-hover:text-gray-900 dark:text-white/85 dark:group-hover:text-white">
          {name}
        </h3>

        <div className="flex items-center gap-1.5">
          <StarRating rating={r} />
          <span className="text-[12px] font-bold text-[#FF9900]">{r.toFixed(1)}</span>
          <span className="text-[11px] text-gray-400 dark:text-white/25">/ 5</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-white/25">Amazon Price</p>
            {p > 0 ? (
              <div className="flex items-baseline gap-1.5">
                <p className="text-[20px] font-extrabold leading-none tracking-tight text-[#FF9900]">
                  ₹{p.toLocaleString("en-IN")}
                </p>
                {discount >= 5 && (
                  <p className="text-[11px] font-medium leading-none text-gray-400 line-through dark:text-white/25">
                    ₹{m.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[13px] font-semibold leading-none text-[#FF9900]">
                Check on Amazon
              </p>
            )}
          </div>
          <Link
            href={`/product/${slug}`}
            className="group/btn flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#FF9900] to-[#e68a00] px-3.5 py-2 text-[12px] font-bold text-black shadow-[0_2px_12px_rgba(255,153,0,0.25)] transition-all duration-200 hover:shadow-[0_4px_20px_rgba(255,153,0,0.45)] hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
          >
            View Deal
            <span className="transition-transform duration-200 group-hover/btn:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>

    </article>
  );
}
