"use client";

import { useEffect } from "react";

/**
 * Admin layout — forces dark mode so the admin dashboard always renders
 * on a dark background, regardless of the user's site-wide theme setting.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.add("dark");

    return () => {
      // Restore whatever state the user had before entering admin
      if (!hadDark) {
        const stored = localStorage.getItem("theme");
        if (!stored || stored === "light") {
          html.classList.remove("dark");
        }
      }
    };
  }, []);

  return (
    // Negative margins cancel out container-shell's padding so the dark
    // bg bleeds wall-to-wall; re-apply the same padding inside.
    <div className="bg-[#0d0d12] -mx-4 -mt-8 -mb-8 px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 min-h-[calc(100vh-62px)]">
      {children}
    </div>
  );
}
