"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  slug: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
};

const SORT_OPTIONS = [
  { label: "Best Match",   value: "" },
  { label: "Top Rated",    value: "rating" },
  { label: "Price: Low ↑", value: "price-asc" },
  { label: "Price: High ↓",value: "price-desc" },
  { label: "Best Value",   value: "value" },
] as const;

const BUDGET_OPTIONS = [
  { label: "Any Budget",   minPrice: "",       maxPrice: "" },
  { label: "Under ₹2,000", minPrice: "",       maxPrice: "2000" },
  { label: "₹2k – ₹10k",  minPrice: "2000",   maxPrice: "10000" },
  { label: "₹10k – ₹30k", minPrice: "10000",  maxPrice: "30000" },
  { label: "₹30k – ₹1L",  minPrice: "30000",  maxPrice: "100000" },
  { label: "Over ₹1L",    minPrice: "100000",  maxPrice: "" },
] as const;

const RATING_OPTIONS = [
  { label: "Any Rating", value: "" },
  { label: "4.5★+",      value: "4.5" },
  { label: "4.0★+",      value: "4.0" },
  { label: "3.5★+",      value: "3.5" },
] as const;

export function CategoryFilters({ slug, sort, minPrice, maxPrice, minRating }: Props) {
  const [open, setOpen] = useState(false);

  function buildHref(overrides: {
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    minRating?: string;
    page?: number;
  }) {
    const p = new URLSearchParams();
    const so = "sort"      in overrides ? overrides.sort      : sort;
    const mn = "minPrice"  in overrides ? overrides.minPrice  : minPrice;
    const mx = "maxPrice"  in overrides ? overrides.maxPrice  : maxPrice;
    const mr = "minRating" in overrides ? overrides.minRating : minRating;
    // Filter changes always reset to page 1
    const pg = "page" in overrides ? overrides.page : 1;
    if (so) p.set("sort", so);
    if (mn) p.set("minPrice", mn);
    if (mx) p.set("maxPrice", mx);
    if (mr) p.set("minRating", mr);
    if (pg && pg > 1) p.set("page", String(pg));
    const qs = p.toString();
    return `/category/${slug}${qs ? `?${qs}` : ""}`;
  }

  // Active state helpers
  const activeSortLabel   = SORT_OPTIONS.find(o => o.value === sort)?.label ?? "Best Match";
  const activeBudget      = BUDGET_OPTIONS.find(o => o.minPrice === minPrice && o.maxPrice === maxPrice);
  const activeBudgetLabel = activeBudget?.label ?? "Any Budget";
  const activeRatingLabel = RATING_OPTIONS.find(o => o.value === minRating)?.label ?? "Any Rating";
  const anyFilterActive   = sort !== "" || minPrice !== "" || maxPrice !== "" || minRating !== "";
  const activeCount       = [sort, minPrice || maxPrice, minRating].filter(Boolean).length;

  const pill = "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap";
  const pillActive   = `${pill} border-[#FF9900] bg-[#FF9900]/10 text-[#FF9900]`;
  const pillInactive = `${pill} border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#16161e] text-gray-600 dark:text-white/55 hover:border-[#FF9900]/40 hover:text-[#FF9900]`;

  const section = "space-y-2";
  const sectionTitle = "text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-white/35";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] overflow-hidden">

      {/* ── Mobile toggle bar ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 md:hidden"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#FF9900]" strokeWidth={2} />
          <span className="text-[13px] font-semibold text-gray-800 dark:text-white/85">
            Filters
            {activeCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#FF9900] text-[9px] font-black text-black">
                {activeCount}
              </span>
            )}
          </span>
          {anyFilterActive && (
            <span className="text-[11px] text-gray-400 dark:text-white/35">
              · {activeSortLabel !== "Best Match" ? activeSortLabel : ""}
              {activeBudget && activeBudget.label !== "Any Budget" ? ` · ${activeBudgetLabel}` : ""}
              {minRating ? ` · ${activeRatingLabel}` : ""}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 dark:text-white/35" strokeWidth={2} />
          : <ChevronDown className="h-4 w-4 text-gray-400 dark:text-white/35" strokeWidth={2} />}
      </button>

      {/* ── Filter panel — always visible on md+, toggle on mobile ── */}
      <div className={`${open ? "block" : "hidden"} md:block border-t border-gray-100 dark:border-white/[0.05] md:border-t-0`}>
        <div className="flex flex-col gap-5 p-4 md:flex-row md:flex-wrap md:items-start md:gap-6">

          {/* Sort */}
          <div className={section}>
            <p className={sectionTitle}>Sort By</p>
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map(({ label, value }) => (
                <Link key={value} href={buildHref({ sort: value })}
                  className={sort === value ? pillActive : pillInactive}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className={section}>
            <p className={sectionTitle}>Budget</p>
            <div className="flex flex-wrap gap-1.5">
              {BUDGET_OPTIONS.map(({ label, minPrice: mn, maxPrice: mx }) => {
                const isActive = minPrice === mn && maxPrice === mx;
                return (
                  <Link key={label} href={buildHref({ minPrice: mn, maxPrice: mx })}
                    className={isActive ? pillActive : pillInactive}>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div className={section}>
            <p className={sectionTitle}>Min Rating</p>
            <div className="flex flex-wrap gap-1.5">
              {RATING_OPTIONS.map(({ label, value }) => (
                <Link key={value} href={buildHref({ minRating: value })}
                  className={minRating === value ? pillActive : pillInactive}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Clear all */}
          {anyFilterActive && (
            <div className="flex items-end md:ml-auto">
              <Link href={`/category/${slug}`}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-rose-400 hover:text-rose-500 transition-colors">
                <X className="h-3 w-3" strokeWidth={2.5} /> Clear filters
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
