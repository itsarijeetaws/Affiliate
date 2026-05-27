"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clientFetchUrl } from "@/lib/api";
import { AUTH_EVENT_NAME, clearStoredToken, getStoredToken, type AuthUser } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";
import { Search, LayoutGrid, BookOpen, User, ShieldCheck, ChevronLeft, ChevronRight, ChevronDown, Tag, Menu, X } from "lucide-react";

const NAV_CATEGORIES = [
  { label: "Electronics",      slug: "electronics" },
  { label: "Smartphones",      slug: "smartphones" },
  { label: "Laptops",          slug: "laptops" },
  { label: "Audio",            slug: "home-audio" },
  { label: "Home Appliances",  slug: "home-appliances" },
  { label: "Home & Kitchen",   slug: "kitchen-appliances" },
  { label: "Headphones",       slug: "headphones" },
  { label: "Gaming",           slug: "gaming" },
  { label: "Smartwatches",     slug: "smartwatches" },
  { label: "Power Banks",      slug: "power-banks" },
  { label: "Grooming & Beauty",slug: "grooming" },
  { label: "Cameras",          slug: "cameras" },
  { label: "Monitors",         slug: "monitors" },
  { label: "Fitness",          slug: "fitness" },
  { label: "Baby & Kids",      slug: "baby-kids" },
  { label: "PC Peripherals",   slug: "computer-peripherals" },
  { label: "Women's Fashion",  slug: "womens-fashion" },
  { label: "Men's Fashion",    slug: "mens-fashion" },
  { label: "Bags & Luggage",   slug: "bags-luggage" },
  { label: "Automotive",       slug: "automotive" },
  { label: "Home & Decor",     slug: "home-decor" },
  { label: "Books",            slug: "books" },
];

export function Header() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [query, setQuery] = useState("");
  const [searchCat, setSearchCat] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const catDropRef = useRef<HTMLDivElement>(null);

  const updateScrollButtons = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateScrollButtons); ro.disconnect(); };
  }, [updateScrollButtons]);

  function scrollNav(dir: "left" | "right") {
    const el = navScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  }

  // Close category dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
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
    setMobileMenuOpen(false);
    const q = query.trim();
    if (!q && searchCat) {
      router.push(`/category/${searchCat}`);
    } else if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/search");
    }
  }

  return (
    <header className="sticky top-0 z-50">

      {/* ── Row 1: Logo + Search + Nav ── */}
      <div className="border-b border-gray-200/80 bg-white/90 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0d0d14]/95">
        <div className="container-shell flex h-[62px] items-center gap-4 md:gap-6">

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
          <form onSubmit={handleSearch} className="search-wrap flex-1 h-[38px]">
            {/* Custom category dropdown — no native select (can't dark-theme OS dropdown) */}
            <div ref={catDropRef} className="relative flex items-center h-full shrink-0 border-r border-gray-200/80 dark:border-white/10 rounded-l-[100px] overflow-visible">
              <button
                type="button"
                onClick={() => setCatOpen(o => !o)}
                className="flex items-center gap-1 h-full pl-3 pr-2 text-[11.5px] font-semibold text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80 transition-colors whitespace-nowrap max-w-[82px] sm:max-w-[100px] truncate"
                aria-haspopup="listbox"
                aria-expanded={catOpen}
              >
                <span className="truncate">
                  {searchCat ? NAV_CATEGORIES.find(c => c.slug === searchCat)?.label ?? "All" : "All"}
                </span>
                <ChevronDown
                  className={`shrink-0 h-3 w-3 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`}
                  strokeWidth={2.5}
                />
              </button>

              {/* Dropdown panel */}
              {catOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-[200] w-44 rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#1a1a24] shadow-xl overflow-hidden">
                  <div className="max-h-72 overflow-y-auto py-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
                    {[{ label: "All", slug: "" }, ...NAV_CATEGORIES].map(c => (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => { setSearchCat(c.slug); setCatOpen(false); inputRef.current?.focus(); }}
                        className={`w-full text-left px-3 py-2 text-[12.5px] transition-colors ${
                          searchCat === c.slug
                            ? "bg-[#FF9900]/10 text-[#FF9900] font-semibold"
                            : "text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.06] font-medium"
                        }`}
                      >
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
            <Link
              href="/search?sort=price-asc"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-[#FF9900] transition-all hover:bg-[#FF9900]/[0.08] md:flex"
            >
              <Tag className="h-3.5 w-3.5" strokeWidth={2} />
              Deals
            </Link>
            <Link
              href="/compare"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/[0.07] dark:hover:text-white/90 md:flex"
            >
              <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />
              Compare
            </Link>
            <Link
              href="/blog"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/[0.07] dark:hover:text-white/90 md:flex"
            >
              <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
              Guides
            </Link>
            <Link
              href="/account"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/[0.07] dark:hover:text-white/90"
            >
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

            {/* Theme toggle */}
            <ThemeToggle />

            {user?.isAdmin && (
              <Link
                href="/admin"
                className="ml-1 flex items-center gap-1.5 rounded-lg bg-[#FF9900]/10 border border-[#FF9900]/25 px-3 py-1.5 text-[13px] font-semibold text-[#FF9900] transition-all hover:bg-[#FF9900]/20 hover:border-[#FF9900]/40 hover:shadow-[0_0_12px_rgba(255,153,0,0.15)]"
              >
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
                Admin
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* ── Mobile menu drawer (md:hidden) ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200/80 bg-white/97 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0d0d14]/98">
          <nav className="container-shell py-2 space-y-0.5">
            <Link
              href="/search?sort=price-asc"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-[#FF9900] hover:bg-[#FF9900]/[0.08] transition-colors"
            >
              <Tag className="h-4 w-4 shrink-0" strokeWidth={2} />
              Deals
            </Link>
            <Link
              href="/compare"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2} />
              Compare Products
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
              Guides &amp; Blog
            </Link>
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <User className="h-4 w-4 shrink-0" strokeWidth={2} />
              {user ? (user.name || user.email.split("@")[0]) : "Sign in / Register"}
            </Link>
            {user?.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-[#FF9900] bg-[#FF9900]/[0.07] hover:bg-[#FF9900]/[0.13] transition-colors"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
                Admin Panel
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* ── Row 2: Category nav strip ── */}
      <div className="relative border-b border-gray-200/70 bg-gray-50/90 backdrop-blur-md dark:border-white/[0.05] dark:bg-[#0a0a10]/95">
        <div className="container-shell relative flex items-center">
          {/* Left arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scrollNav("left")}
              className="absolute left-0 z-10 flex h-full items-center bg-gradient-to-r from-gray-50/95 via-gray-50/90 to-transparent pr-3 dark:from-[#0a0a10]/95 dark:via-[#0a0a10]/90"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4 text-gray-400 dark:text-white/40" strokeWidth={2.5} />
            </button>
          )}

          <div
            ref={navScrollRef}
            className="flex items-center gap-0 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <Link href="/search" className="cat-pill shrink-0 font-semibold text-[#FF9900]/90 hover:text-[#FF9900]">
              All Products
            </Link>
            <span className="mx-1.5 h-3.5 w-px shrink-0 bg-gray-200 dark:bg-white/[0.1]" />
            {NAV_CATEGORIES.map((cat) => (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="cat-pill shrink-0">
                {cat.label}
              </Link>
            ))}
          </div>

          {/* Right arrow */}
          {canScrollRight && (
            <button
              onClick={() => scrollNav("right")}
              className="absolute right-0 z-10 flex h-full items-center bg-gradient-to-l from-gray-50/95 via-gray-50/90 to-transparent pl-3 dark:from-[#0a0a10]/95 dark:via-[#0a0a10]/90"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4 text-gray-400 dark:text-white/40" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

    </header>
  );
}
