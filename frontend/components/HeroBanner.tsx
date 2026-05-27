"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

type Slide = {
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  from: string;
  via: string;
  to: string;
  accent: string;
  imageUrl?: string;
};

const SLIDES: Slide[] = [
  {
    tag: "👗 10% Commission",
    title: "Women's Fashion Picks",
    subtitle: "Top-rated kurtas, dresses & ethnic wear — live Amazon India prices",
    cta: "Shop Women's Fashion",
    href: "/category/womens-fashion",
    from: "#1a0010",
    via: "#3b0022",
    to: "#1a0010",
    accent: "#f43f5e",
  },
  {
    tag: "👔 10% Commission",
    title: "Men's Fashion Picks",
    subtitle: "Best-rated shirts, trousers & casual wear for Indian men",
    cta: "Shop Men's Fashion",
    href: "/category/mens-fashion",
    from: "#00101a",
    via: "#00274a",
    to: "#00101a",
    accent: "#38bdf8",
  },
  {
    tag: "👜 10% Commission",
    title: "Bags & Luggage",
    subtitle: "Top backpacks, trolley bags & handbags — trusted Amazon reviews",
    cta: "Shop Bags",
    href: "/category/bags-luggage",
    from: "#100020",
    via: "#250040",
    to: "#100020",
    accent: "#a855f7",
  },
  {
    tag: "🔥 Bestsellers",
    title: "Top Smartphones",
    subtitle: "Expert reviews on India's most popular phones — live Amazon prices",
    cta: "Shop Smartphones",
    href: "/category/smartphones",
    from: "#1a1040",
    via: "#2d1b69",
    to: "#1a1040",
    accent: "#a78bfa",
  },
  {
    tag: "💻 Editor's Pick",
    title: "Best Laptops",
    subtitle: "Top-rated laptops under ₹1 lakh — updated daily",
    cta: "Browse Laptops",
    href: "/category/laptops",
    from: "#0a1628",
    via: "#0f2d50",
    to: "#0a1628",
    accent: "#38bdf8",
  },
  {
    tag: "🎧 Trending Now",
    title: "Audio Bestsellers",
    subtitle: "Premium headphones & speakers at the best prices on Amazon",
    cta: "Explore Audio",
    href: "/category/headphones",
    from: "#1a0a00",
    via: "#2e1500",
    to: "#1a0a00",
    accent: "#FF9900",
  },
  {
    tag: "🎮 Game On",
    title: "Level Up Your Setup",
    subtitle: "Best gaming gear reviewed & rated for Indian gamers",
    cta: "Shop Gaming",
    href: "/category/gaming",
    from: "#0d0005",
    via: "#1f0010",
    to: "#0d0005",
    accent: "#f472b6",
  },
];

export function HeroBanner({ topImages }: { topImages?: Record<string, string> }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent(c => (c + 1) % SLIDES.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5500);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = SLIDES[current];

  // Map slide href to category slug for image lookup
  const categoryMap: Record<string, string> = {
    "/category/womens-fashion": "womens-fashion",
    "/category/mens-fashion": "mens-fashion",
    "/category/bags-luggage": "bags-luggage",
    "/category/smartphones": "smartphones",
    "/category/laptops": "laptops",
    "/category/headphones": "headphones",
    "/category/gaming": "gaming",
  };
  const catSlug = categoryMap[slide.href];
  const heroImg = catSlug && topImages ? topImages[catSlug] : undefined;

  return (
    <section
      className="relative overflow-hidden rounded-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ background: `linear-gradient(135deg, ${slide.from} 0%, ${slide.via} 50%, ${slide.to} 100%)` }}
    >
      {/* Animated glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full blur-[100px] transition-all duration-700"
        style={{ background: `${slide.accent}30` }}
      />
      <div
        className="pointer-events-none absolute left-1/3 bottom-0 h-48 w-64 rounded-full blur-[80px] transition-all duration-700"
        style={{ background: `${slide.accent}15` }}
      />

      {/* Subtle pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative flex items-center min-h-[280px] sm:min-h-[320px]">
        {/* Text side */}
        <div className="flex-1 px-8 py-14 sm:px-14 sm:py-16">
          <span
            className="inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] mb-4 transition-all duration-500"
            style={{ borderColor: `${slide.accent}55`, color: slide.accent, background: `${slide.accent}20` }}
          >
            {slide.tag}
          </span>

          <h2 className="text-3xl sm:text-[42px] font-extrabold text-white leading-tight tracking-tight max-w-lg transition-all duration-500">
            {slide.title}
          </h2>
          <p className="mt-3 text-[14px] text-white/60 max-w-md leading-relaxed transition-all duration-500">
            {slide.subtitle}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={slide.href}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-bold text-white shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl"
              style={{ background: `linear-gradient(135deg, ${slide.accent}ee, ${slide.accent}99)` }}
            >
              {slide.cta}
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-6 py-3 text-[14px] font-bold text-white transition-all hover:bg-white/20"
            >
              Compare Products
            </Link>
          </div>
        </div>

        {/* Product image side */}
        {heroImg && (
          <div className="hidden sm:flex shrink-0 items-center justify-center w-56 pr-10">
            <div
              className="h-44 w-44 rounded-2xl flex items-center justify-center p-3 transition-all duration-500"
              style={{ background: `${slide.accent}18` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImg}
                alt={slide.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>

      {/* Prev / Next */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:bg-black/50 hover:text-white transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:bg-black/50 hover:text-white transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
      </button>

      {/* Slide indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === current ? 24 : 6,
              background: i === current ? slide.accent : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
