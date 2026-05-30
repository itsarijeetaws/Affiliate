"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetchUrl } from "@/lib/api";
import { AUTH_EVENT_NAME, clearStoredToken, getStoredToken, type AuthUser } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";
import { Search, LayoutGrid, BookOpen, User, ShieldCheck, ChevronDown, Tag, Menu, X } from "lucide-react";

type NavCat = { label: string; slug: string; icon: string };

const NAV_CATEGORIES: NavCat[] = [
  { label: "Women's Fashion",    slug: "womens-fashion",        icon: "👗" },
  { label: "Men's Fashion",      slug: "mens-fashion",          icon: "👔" },
  { label: "Bags & Luggage",     slug: "bags-luggage",          icon: "👜" },
  { label: "Grooming & Beauty",  slug: "grooming",              icon: "💄" },
  { label: "Home & Kitchen",     slug: "kitchen-appliances",    icon: "🍳" },
  { label: "Electronics",        slug: "electronics",           icon: "🔌" },
  { label: "Smartphones",        slug: "smartphones",           icon: "📱" },
  { label: "Laptops",            slug: "laptops",               icon: "💻" },
  { label: "Headphones",         slug: "headphones",            icon: "🎧" },
  { label: "Smart TVs",          slug: "smart-tvs",             icon: "📺" },
  { label: "Smartwatches",       slug: "smartwatches",          icon: "⌚" },
  { label: "Cameras",            slug: "cameras",               icon: "📷" },
  { label: "Gaming",             slug: "gaming",                icon: "🎮" },
  { label: "Monitors",           slug: "monitors",              icon: "🖥️" },
  { label: "Power Banks",        slug: "power-banks",           icon: "🔋" },
  { label: "Home Appliances",    slug: "home-appliances",       icon: "🏡" },
  { label: "Audio",              slug: "home-audio",            icon: "🔊" },
  { label: "Fitness",            slug: "fitness",               icon: "💪" },
  { label: "PC Peripherals",     slug: "computer-peripherals",  icon: "🖱️" },
  { label: "Baby & Kids",        slug: "baby-kids",             icon: "👶" },
  { label: "Toys & Games",       slug: "toys",                  icon: "🧸" },
  { label: "Mobile Accessories", slug: "mobile-accessories",    icon: "📲" },
  { label: "Office Products",    slug: "office-products",       icon: "🗂️" },
  { label: "Automotive",         slug: "automotive",            icon: "🚗" },
  { label: "Home & Decor",       slug: "home-decor",            icon: "🎨" },
  { label: "Books",              slug: "books",                 icon: "📚" },
];

const catBySlug = Object.fromEntries(NAV_CATEGORIES.map(c => [c.slug, c])) as Record<string, NavCat>;

// Always visible in the nav strip
// Ordered by commission: 10% fashion/beauty first, then 5%/3.5% electronics
const PINNED_SLUGS = [
  "womens-fashion", "mens-fashion", "bags-luggage",
  "grooming", "laptops", "electronics",
];

// Mega-dropdown groups
const MEGA_GROUPS: { title: string; cats: NavCat[] }[] = [
  {
    title: "Fashion",
    cats: ["womens-fashion", "mens-fashion", "bags-luggage", "grooming"]
      .map(s => catBySlug[s]).filter(Boolean),
  },
  {
    title: "Electronics",
    cats: ["smartphones", "laptops", "headphones", "smart-tvs", "smartwatches",
           "cameras", "gaming", "monitors", "power-banks", "electronics"]
      .map(s => catBySlug[s]).filter(Boolean),
  },
  {
    title: "Home & Living",
    cats: ["kitchen-appliances", "home-appliances", "home-audio", "fitness", "home-decor"]
      .map(s => catBySlug[s]).filter(Boolean),
  },
  {
    title: "More",
    cats: ["computer-peripherals", "baby-kids", "toys", "mobile-accessories",
           "office-products", "automotive", "books"]
      .map(s => catBySlug[s]).filter(Boolean),
  },
];

export function Header() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [query, setQuery] = useState("");
  const [searchCat, setSearchCat] = useState("");
  const [catOpen, setCatOpen] = useState(false);       // search bar category filter
  const [megaOpen, setMegaOpen] = useState(false);     // all-categories mega dropdown
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const catDropRef = useRef<HTMLDivElement>(null);
  const megaRef = useRef<HTMLDivElement>(null);

  // Close search category dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Close mega dropdown on outside click or Escape
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setMegaOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMegaOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    async function loadUser() {
      const token = getStoredToken();
      if (!token) { setUser(null); return; }
      const response = await fetch(clientFetchUrl("/auth/me"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) { clearStoredToken(); setUser(null); return; }
      const data = await response.json() as { user: AuthUser };
      setUser(data.user);
    }
    void loadUser();
    window.addEventListener(AUTH_EVENT_NAME, loadUser);
    return () => window.removeEventListener(AUTH_EVENT_NAME, loadUser);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setCatOpen(false);
    setMegaOpen(false);
    setMobileMenuOpen(false);
    const q = query.trim();
    if (!q && searchCat) {
      router.push(`/category/${searchCat}`);
    } else if (q) {
      const url = searchCat
        ? `/search?q=${encodeURIComponent(q)}&category=${searchCat}`
        : `/search?q=${encodeURIComponent(q)}`;
      router.push(url);
    } else {
      router.push("/search");
    }
  }

  return (
    <header className="sticky top-0 z-50">

      {/* ── Row 1: Logo + Search + Right nav ── */}
      <div className="border-b border-gray-200/80 bg-white/90 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0d0d14]/95">
        <div className="container-shell flex h-[62px] items-center gap-2 md:gap-6">

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF9900] to-[#e68a00] text-[13px] font-black text-black shadow-[0_0_16px_rgba(255,153,0,0.3)] transition-all duration-200 group-hover:shadow-[0_0_28px_rgba(255,153,0,0.55)] group-hover:scale-105">
              B
            </span>
            <span className="hidden text-[14px] font-bold tracking-tight text-gray-900 dark:text-white sm:block">
              Best<span className="text-[#FF9900]">Buys</span><span className="text-gray-500 dark:text-white/50">India</span>
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="search-wrap flex-1 min-w-0 h-[38px]">
            {/* Category filter dropdown */}
            <div ref={catDropRef} className="relative flex items-center h-full shrink-0 border-r border-gray-200/80 dark:border-white/10 rounded-l-[100px] overflow-visible">
              <button
                type="button"
                onClick={() => setCatOpen(o => !o)}
                className="flex items-center gap-1 h-full pl-3 pr-2 text-[11.5px] font-semibold text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80 transition-colors whitespace-nowrap max-w-[82px] sm:max-w-[100px] truncate"
                aria-haspopup="listbox"
                aria-expanded={catOpen}
              >
                <span className="truncate">
                  {searchCat ? (catBySlug[searchCat]?.label ?? "All") : "All"}
                </span>
                <ChevronDown
                  className={`shrink-0 h-3 w-3 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`}
                  strokeWidth={2.5}
                />
              </button>

              {catOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-[200] w-48 rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#1a1a24] shadow-xl overflow-hidden">
                  <div className="max-h-72 overflow-y-auto py-1 [scrollbar-width:thin]">
                    {[{ label: "All Categories", slug: "", icon: "🔍" }, ...NAV_CATEGORIES].map(c => (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => { setSearchCat(c.slug); setCatOpen(false); inputRef.current?.focus(); }}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] transition-colors ${
                          searchCat === c.slug
                            ? "bg-[#FF9900]/10 text-[#FF9900] font-semibold"
                            : "text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.06] font-medium"
                        }`}
                      >
                        <span className="shrink-0 w-4 text-center leading-none">{c.icon}</span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, reviews, brands…"
              className="search-input h-full text-[14px]"
              aria-label="Search products"
            />
            <button type="submit" className="search-btn h-full flex items-center gap-1.5 text-[13px]">
              <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>

          {/* Right nav */}
          <nav className="flex shrink-0 items-center gap-0.5 text-[13px]">
            <Link href="/search?sort=price-asc"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-[#FF9900] transition-all hover:bg-[#FF9900]/[0.08] md:flex">
              <Tag className="h-3.5 w-3.5" strokeWidth={2} />
              Deals
            </Link>
            <Link href="/compare"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/[0.07] dark:hover:text-white/90 md:flex">
              <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />
              Compare
            </Link>
            <Link href="/blog"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/[0.07] dark:hover:text-white/90 md:flex">
              <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
              Guides
            </Link>
            <Link href="/account"
              className="flex items-center gap-1.5 rounded-lg px-1.5 sm:px-3 py-1.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/[0.07] dark:hover:text-white/90">
              <User className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">{user ? user.email?.split("@")[0] : "Login"}</span>
            </Link>

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden ml-0.5 flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/[0.07] transition-colors"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen
                ? <X className="h-5 w-5" strokeWidth={2} />
                : <Menu className="h-5 w-5" strokeWidth={2} />}
            </button>

            <ThemeToggle />

            {user?.isAdmin && (
              <Link href="/admin"
                className="ml-1 flex items-center gap-1.5 rounded-lg bg-[#FF9900]/10 border border-[#FF9900]/25 px-3 py-1.5 text-[13px] font-semibold text-[#FF9900] transition-all hover:bg-[#FF9900]/20 hover:border-[#FF9900]/40 hover:shadow-[0_0_12px_rgba(255,153,0,0.15)]">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
                Admin
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* ── Mobile menu drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200/80 bg-white/97 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0d0d14]/98">
          <nav className="container-shell py-2 space-y-0.5">
            <Link href="/search?sort=price-asc" onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-[#FF9900] hover:bg-[#FF9900]/[0.08] transition-colors">
              <Tag className="h-4 w-4 shrink-0" strokeWidth={2} /> Deals
            </Link>
            <Link href="/compare" onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
              <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2} /> Compare Products
            </Link>
            <Link href="/blog" onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
              <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} /> Guides &amp; Blog
            </Link>

            {/* All categories accordion */}
            <button
              onClick={() => setMobileCatsOpen(o => !o)}
              className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="shrink-0 text-[16px] leading-none">📦</span>
                All Categories
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileCatsOpen ? "rotate-180" : ""}`} strokeWidth={2} />
            </button>
            {mobileCatsOpen && (
              <div className="mx-2 mb-1 grid grid-cols-2 gap-x-2 gap-y-0.5 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50/70 dark:bg-white/[0.02] p-2">
                {NAV_CATEGORIES.map(cat => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium text-gray-600 dark:text-white/60 hover:bg-white dark:hover:bg-white/[0.07] hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <span className="shrink-0 text-[14px] leading-none">{cat.icon}</span>
                    {cat.label}
                  </Link>
                ))}
              </div>
            )}

            <Link href="/account" onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
              <User className="h-4 w-4 shrink-0" strokeWidth={2} />
              {user ? (user.name || user.email.split("@")[0]) : "Sign in / Register"}
            </Link>
            {user?.isAdmin && (
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-[#FF9900] bg-[#FF9900]/[0.07] hover:bg-[#FF9900]/[0.13] transition-colors">
                <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2} /> Admin Panel
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* ── Row 2: Category nav ── */}
      <div
        ref={megaRef}
        className="relative border-b border-gray-200/70 bg-gray-50/90 backdrop-blur-md dark:border-white/[0.05] dark:bg-[#0a0a10]/95"
      >
        <div className="container-shell flex h-10 items-center">

          {/* Pinned pills — scrollable on mobile, static on desktop */}
          <div className="flex flex-1 min-w-0 items-center gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/search" className="cat-pill shrink-0 font-semibold text-[#FF9900]/90 hover:text-[#FF9900]">
              All Products
            </Link>
            <span className="mx-1.5 h-3.5 w-px shrink-0 bg-gray-200 dark:bg-white/[0.1]" />
            {PINNED_SLUGS.map(slug => {
              const cat = catBySlug[slug];
              if (!cat) return null;
              return (
                <Link key={slug} href={`/category/${slug}`} className="cat-pill shrink-0">
                  {cat.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop: "All Categories" mega button */}
          <button
            onClick={() => setMegaOpen(o => !o)}
            aria-expanded={megaOpen}
            className="hidden md:flex ml-3 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-white/[0.04] px-3 py-[5px] text-[12.5px] font-semibold text-gray-600 dark:text-white/55 transition-all hover:border-[#FF9900]/40 hover:bg-[#FF9900]/[0.05] hover:text-[#FF9900]"
          >
            All Categories
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`}
              strokeWidth={2.5}
            />
          </button>

          {/* Mobile: "More ▼" pill */}
          <button
            onClick={() => { setMobileMenuOpen(true); setMobileCatsOpen(true); }}
            className="md:hidden ml-2 shrink-0 cat-pill flex items-center gap-1 !text-gray-500 dark:!text-white/45"
          >
            More <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Mega dropdown panel ── */}
        {megaOpen && (
          <div className="absolute left-0 right-0 top-full z-[300] border-b border-gray-200/70 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:border-white/[0.06] dark:bg-[#13131c] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
            <div className="container-shell py-6">
              <div className="grid grid-cols-4 gap-x-8">
                {MEGA_GROUPS.map(group => (
                  <div key={group.title}>
                    {/* Group header */}
                    <p className="mb-2.5 text-[10.5px] font-black uppercase tracking-[0.13em] text-gray-400 dark:text-white/25">
                      {group.title}
                    </p>
                    <ul className="space-y-0.5">
                      {group.cats.map(cat => (
                        <li key={cat.slug}>
                          <Link
                            href={`/category/${cat.slug}`}
                            onClick={() => setMegaOpen(false)}
                            className="group flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13px] font-medium text-gray-700 dark:text-white/65 transition-colors hover:bg-[#FF9900]/[0.07] hover:text-[#d97b00] dark:hover:bg-white/[0.06] dark:hover:text-white"
                          >
                            <span className="shrink-0 w-5 text-center text-[15px] leading-none">
                              {cat.icon}
                            </span>
                            {cat.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Footer row */}
              <div className="mt-5 border-t border-gray-100 dark:border-white/[0.06] pt-4 flex items-center justify-between">
                <p className="text-[12px] text-gray-400 dark:text-white/25">
                  {NAV_CATEGORIES.length} categories · Best deals on Amazon India
                </p>
                <Link
                  href="/search"
                  onClick={() => setMegaOpen(false)}
                  className="text-[12px] font-semibold text-[#FF9900] hover:text-[#e68a00] transition-colors"
                >
                  Browse all products →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

    </header>
  );
}
