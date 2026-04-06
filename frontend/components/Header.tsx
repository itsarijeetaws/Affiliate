"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clientFetchUrl } from "@/lib/api";
import { AUTH_EVENT_NAME, clearStoredToken, getStoredToken, type AuthUser } from "@/lib/auth";

export function Header() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function loadUser() {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        return;
      }

      const response = await fetch(clientFetchUrl("/auth/me"), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        clearStoredToken();
        setUser(null);
        return;
      }

      const data = await response.json() as { user: AuthUser };
      setUser(data.user);
    }

    void loadUser();
    window.addEventListener(AUTH_EVENT_NAME, loadUser);
    return () => window.removeEventListener(AUTH_EVENT_NAME, loadUser);
  }, []);

  return (
    <header className="border-b border-white/10 bg-[rgba(6,14,24,0.72)] backdrop-blur-xl">
      <div className="container-shell flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 text-sm font-black text-slate-950 shadow-[0_12px_40px_rgba(251,146,60,0.35)]">
            AL
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-[0.18em] text-white/70">AFFILIATELAB</span>
            <span className="block text-sm text-white/90">Modern product intelligence</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-white/78">
          <Link href="/blog" className="nav-pill">Guides</Link>
          <Link href="/compare" className="nav-pill">Compare</Link>
          <Link href="/search" className="nav-pill">Search</Link>
          <Link href="/account" className="nav-pill">{user ? "Account" : "Login"}</Link>
          {user?.isAdmin ? (
            <Link href="/admin" className="rounded-full border border-amber-300/40 bg-amber-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-200">
              Admin
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
