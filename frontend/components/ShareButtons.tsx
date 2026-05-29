"use client";

import { useState } from "react";

type Props = {
  url: string;
  title: string;
};

export function ShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

  function copyLink() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-gray-400 dark:text-white/30">Share:</span>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${encTitle}%0A${enc}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/25 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.38 1.26 4.79L2 22l5.46-1.43a9.82 9.82 0 004.58 1.14c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.52 14.16c-.23.65-1.35 1.24-1.85 1.32-.47.08-1.07.11-1.72-.11-.4-.13-.9-.3-1.56-.59-2.74-1.18-4.53-3.94-4.67-4.13-.14-.19-1.1-1.46-1.1-2.78 0-1.32.69-1.97 1-2.28.3-.3.65-.38.87-.38.22 0 .43 0 .62.01.2.01.47-.08.73.56.27.65.91 2.24.99 2.4.08.16.14.35.03.56-.11.21-.16.34-.32.52-.16.18-.34.4-.48.54-.16.16-.33.33-.14.65.19.32.84 1.38 1.8 2.24 1.24 1.1 2.28 1.44 2.6 1.6.32.16.51.13.7-.08.19-.21.81-.95 1.03-1.27.21-.32.43-.27.72-.16.3.11 1.89.89 2.21 1.05.32.16.54.24.62.38.08.14.08.8-.15 1.45z"/>
        </svg>
      </a>

      {/* Twitter / X */}
      <a
        href={`https://twitter.com/intent/tweet?text=${encTitle}&url=${enc}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.07] text-gray-700 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </a>

      {/* Copy link */}
      <button
        onClick={copyLink}
        className="flex h-7 items-center gap-1 rounded-full bg-gray-100 dark:bg-white/[0.07] px-2.5 text-[11px] font-semibold text-gray-600 dark:text-white/55 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors"
      >
        {copied ? "✓ Copied!" : "Copy link"}
      </button>
    </div>
  );
}
