"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight, ShoppingCart } from "lucide-react";

type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  price: number | string;
  rating: number | string;
  amazonAsin?: string;
};

type Props = {
  title: string;
  categorySlug: string;
  products: Product[];
  accent?: string;
  badgeLabel?: string;
};

export function CategoryCarousel({
  title,
  categorySlug,
  products,
  accent = "#FF9900",
  badgeLabel,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // slight delay to let layout settle
    const t = setTimeout(update, 80);
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, products]);

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  }

  if (!products.length) return null;

  return (
    <section className="rounded-2xl border border-gray-200/70 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-bold tracking-tight text-gray-900 dark:text-white">
            {title}
          </h2>
          {badgeLabel && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white"
              style={{ background: accent }}
            >
              {badgeLabel}
            </span>
          )}
        </div>
        <Link
          href={`/category/${categorySlug}`}
          className="flex items-center gap-1 text-[12px] font-semibold transition-all hover:gap-1.5"
          style={{ color: accent }}
        >
          See all <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
        </Link>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Left arrow */}
        {canLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#1c1c28] border border-gray-200 dark:border-white/10 shadow-md hover:shadow-lg transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-white/70" strokeWidth={2.5} />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p, idx) => {
            const price = Number(p.price);
            const rating = Number(p.rating);
            return (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className="group flex-shrink-0 w-40 sm:w-44 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-[#0f0f18] overflow-hidden hover:shadow-md hover:border-gray-200 dark:hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Image */}
                <div className="relative h-36 sm:h-40 flex items-center justify-center overflow-hidden bg-white dark:bg-[#0f0f18]">
                  {/* Rank badge */}
                  {idx < 3 && (
                    <span
                      className="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white shadow-md"
                      style={{ background: accent }}
                    >
                      {idx + 1}
                    </span>
                  )}
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      onError={e => {
                        const asin = p.amazonAsin;
                        const fb = asin
                          ? `https://m.media-amazon.com/images/P/${asin}._SL500_.jpg`
                          : "";
                        const img = e.currentTarget;
                        if (fb && img.src !== fb) img.src = fb;
                        else img.style.opacity = "0";
                      }}
                    />
                  ) : (
                    <ShoppingCart className="h-8 w-8 text-gray-200 dark:text-white/10" strokeWidth={1.5} />
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="line-clamp-2 text-[11.5px] font-semibold leading-snug text-gray-800 dark:text-white/85 group-hover:text-gray-900 dark:group-hover:text-white min-h-[2.5em]">
                    {p.name}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <p
                      className="text-[13px] font-bold truncate"
                      style={{ color: accent }}
                    >
                      {price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Check →"}
                    </p>
                    {rating > 0 && (
                      <span className="flex items-center gap-0.5 shrink-0 text-[10px] font-bold text-gray-400 dark:text-white/35">
                        <svg className="h-2.5 w-2.5 fill-[#FF9900]" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.566-.955L10 0l2.946 5.955 6.566.955-4.756 4.635 1.122 6.545z"/></svg>
                        {rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Right arrow */}
        {canRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#1c1c28] border border-gray-200 dark:border-white/10 shadow-md hover:shadow-lg transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-white/70" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </section>
  );
}
