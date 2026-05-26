"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, Star, TrendingDown, Award, CheckCircle, XCircle, ChevronDown } from "lucide-react";
import { clientFetchUrl } from "@/lib/api";

type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  amazonAsin: string;
  price: number | string;
  rating: number;
  affiliateUrl: string;
  description: string;
  pros: string[];
  cons: string[];
  category: { id: number; name: string; slug: string } | null;
};

type Category = { id: number; name: string; slug: string };

function parseArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter(Boolean) : []; } catch { return []; }
  }
  return [];
}

function Stars({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(0, Number(rating)));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= Math.round(r) ? "fill-[#FF9900] text-[#FF9900]" : "fill-transparent text-gray-300 dark:text-white/20"}`}
          strokeWidth={1.5}
        />
      ))}
      <span className="ml-1 text-[11px] font-bold text-gray-600 dark:text-white/60">{r.toFixed(1)}</span>
    </div>
  );
}

function RatingBar({ value, max = 5, label }: { value: number; max?: number; label: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] text-gray-400 dark:text-white/35">
        <span>{label}</span>
        <span className="font-semibold text-gray-600 dark:text-white/55">{value}/{max}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, #FF9900, #ffb347)` }}
        />
      </div>
    </div>
  );
}

export function CompareClient({ initialCategories }: { initialCategories: Category[] }) {
  const [categories] = useState<Category[]>(initialCategories);
  const [selectedSlug, setSelectedSlug] = useState(initialCategories[0]?.slug ?? "");
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadProducts = useCallback(async (slug: string) => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetch(clientFetchUrl(`/products?categorySlug=${slug}&limit=50`));
      if (res.ok) {
        const data = await res.json() as { items: Product[] };
        const items = data.items ?? [];
        setProducts(items);
        // Auto-select first 3
        setSelected(new Set(items.slice(0, 3).map(p => p.id)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSlug) void loadProducts(selectedSlug);
  }, [selectedSlug, loadProducts]);

  const comparing = products.filter(p => selected.has(p.id));

  // Compute badges
  const prices = comparing.map(p => Number(p.price)).filter(x => x > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxRating = comparing.length ? Math.max(...comparing.map(p => Number(p.rating))) : 0;

  function toggleProduct(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev; // keep at least 1
        next.delete(id);
      } else {
        if (next.size >= 4) {
          // Remove oldest (first in set)
          const [first] = next;
          next.delete(first);
        }
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">

      {/* Category selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-white/35">Compare in:</span>
        <div className="relative">
          <select
            value={selectedSlug}
            onChange={e => setSelectedSlug(e.target.value)}
            className="appearance-none rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161e] pl-4 pr-9 py-2 text-sm font-semibold text-gray-700 dark:text-white focus:outline-none focus:border-[#FF9900]/50 cursor-pointer"
          >
            {categories.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/35" />
        </div>
        {loading && <span className="text-[11px] text-[#FF9900] animate-pulse">Loading…</span>}
      </div>

      {/* Product picker — horizontal scrollable mini cards */}
      {products.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-white/35">
            Select up to 4 products · {selected.size} selected
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {products.slice(0, 15).map(p => {
              const isOn = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`group flex-shrink-0 w-28 flex flex-col items-center rounded-xl border-2 p-2 transition-all cursor-pointer ${
                    isOn
                      ? "border-[#FF9900] bg-[#FF9900]/5 shadow-[0_0_0_2px_rgba(255,153,0,0.15)]"
                      : "border-gray-100 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/15"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50 dark:bg-[#0f0f18] flex items-center justify-center">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain p-1"
                        onError={e => {
                          const fb = p.amazonAsin ? `https://m.media-amazon.com/images/P/${p.amazonAsin}._SL500_.jpg` : "";
                          const img = e.currentTarget;
                          if (fb && img.src !== fb) img.src = fb; else img.style.opacity = "0";
                        }}
                      />
                    ) : (
                      <ShoppingCart className="h-6 w-6 text-gray-200 dark:text-white/10" />
                    )}
                    {isOn && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#FF9900]/20">
                        <CheckCircle className="h-5 w-5 text-[#FF9900]" strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                  {/* Name */}
                  <p className={`mt-1.5 text-center text-[10px] leading-tight line-clamp-2 ${isOn ? "font-semibold text-[#FF9900]" : "text-gray-500 dark:text-white/45"}`}>
                    {p.name}
                  </p>
                  {/* Price */}
                  {Number(p.price) > 0 && (
                    <p className="mt-0.5 text-[9px] font-bold text-gray-400 dark:text-white/30">
                      ₹{Number(p.price).toLocaleString("en-IN")}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison grid */}
      {comparing.length > 0 && (
        <div className={`grid gap-4 ${comparing.length === 1 ? "grid-cols-1 max-w-sm" : comparing.length === 2 ? "grid-cols-2" : comparing.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
          {comparing.map(p => {
            const price = Number(p.price);
            const rating = Number(p.rating);
            const isCheapest = price > 0 && price === minPrice && comparing.filter(x => Number(x.price) > 0).length > 1;
            const isTopRated = rating === maxRating && comparing.length > 1;
            const pros = parseArr(p.pros);
            const cons = parseArr(p.cons);

            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border bg-white dark:bg-[#16161e] overflow-hidden transition-shadow hover:shadow-lg dark:hover:shadow-black/40 ${
                  isCheapest || isTopRated
                    ? "border-[#FF9900]/40 shadow-[0_0_0_1px_rgba(255,153,0,0.15)]"
                    : "border-gray-200 dark:border-white/[0.07]"
                }`}
              >
                {/* Badges */}
                <div className="absolute left-3 top-3 flex flex-col gap-1 z-10">
                  {isCheapest && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      <TrendingDown className="h-2.5 w-2.5" /> Best Price
                    </span>
                  )}
                  {isTopRated && (
                    <span className="flex items-center gap-1 rounded-full bg-[#FF9900] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      <Award className="h-2.5 w-2.5" /> Top Rated
                    </span>
                  )}
                </div>

                {/* Image */}
                <div className="aspect-[4/3] bg-gray-50 dark:bg-[#0f0f18] flex items-center justify-center overflow-hidden">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain p-4"
                      onError={e => {
                        const fallback = p.amazonAsin
                          ? `https://m.media-amazon.com/images/P/${p.amazonAsin}._SL500_.jpg`
                          : "";
                        const img = e.currentTarget;
                        if (fallback && img.src !== fallback) { img.src = fallback; }
                        else { img.style.display = "none"; }
                      }}
                    />
                  ) : (
                    <ShoppingCart className="h-10 w-10 text-gray-200 dark:text-white/10" />
                  )}
                </div>

                <div className="flex flex-col gap-3 p-4">
                  {/* Name */}
                  <a href={`/product/${p.slug}`} className="text-[13px] font-bold leading-snug text-gray-800 dark:text-white/90 hover:text-[#FF9900] transition-colors line-clamp-2">
                    {p.name}
                  </a>

                  {/* Price */}
                  <div>
                    {price > 0 ? (
                      <p className="text-[22px] font-extrabold leading-none text-[#FF9900]">
                        ₹{price.toLocaleString("en-IN")}
                      </p>
                    ) : (
                      <p className="text-[13px] font-semibold text-[#FF9900]">Check on Amazon</p>
                    )}
                  </div>

                  {/* Stars + rating bar */}
                  <div className="space-y-2">
                    <Stars rating={rating} />
                    <RatingBar value={rating} max={5} label="Customer Rating" />
                    {price > 0 && (
                      <RatingBar
                        value={Math.max(0, 5 - Math.min(5, price / 10000))}
                        max={5}
                        label="Value for Money"
                      />
                    )}
                  </div>

                  {/* Pros */}
                  {pros.length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-500">Pros</p>
                      <ul className="space-y-1">
                        {pros.slice(0, 3).map((pro, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-white/60">
                            <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" strokeWidth={2.5} />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cons */}
                  {cons.length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-rose-400">Cons</p>
                      <ul className="space-y-1">
                        {cons.slice(0, 2).map((con, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-white/60">
                            <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" strokeWidth={2.5} />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Description snippet */}
                  {p.description && (
                    <p className="text-[11px] leading-relaxed text-gray-400 dark:text-white/30 line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  {/* Buy button */}
                  <a
                    href={p.affiliateUrl || "#"}
                    target="_blank"
                    rel="nofollow sponsored noopener noreferrer"
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF9900] to-[#ffb347] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(255,153,0,0.3)] transition-all hover:shadow-[0_6px_20px_rgba(255,153,0,0.45)] hover:scale-[1.02]"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Buy on Amazon
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {products.length === 0 && !loading && (
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-12 text-center">
          <p className="text-gray-400 dark:text-white/30">Select a category to start comparing</p>
        </div>
      )}

    </div>
  );
}
