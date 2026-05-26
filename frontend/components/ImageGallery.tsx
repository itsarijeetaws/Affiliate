"use client";

import { useState, useEffect, useCallback } from "react";
import { ImageIcon } from "lucide-react";

function normalizeAmazonImage(url: string): string {
  if (!url) return "";
  if (url.includes("m.media-amazon.com")) return url;
  const m = url.match(/\/images\/I\/([A-Za-z0-9%+_\-]+)\./);
  if (m) return `https://m.media-amazon.com/images/I/${m[1]}._SL500_.jpg`;
  return url;
}

function getLargeVersion(url: string): string {
  return url
    .replace(/\._SL\d+_\./, "._SL1500_.")
    .replace(/\._AC_SX\d+_\./, "._SL1500_.")
    .replace(/\._AC_UL\d+_\./, "._SL1500_.");
}

type Props = {
  imageUrl: string;
  productName: string;
  affiliateUrl: string;
  amazonAsin?: string;
};

export function ImageGallery({ imageUrl, productName, affiliateUrl, amazonAsin }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState(() => normalizeAmazonImage(imageUrl));
  const [imgError, setImgError] = useState(false);

  const hasImage = Boolean(imgSrc) && !imgError;
  const largeUrl = hasImage ? getLargeVersion(imgSrc) : "";

  function handleImgError() {
    const fallback = amazonAsin
      ? `https://m.media-amazon.com/images/P/${amazonAsin}._SL500_.jpg`
      : "";
    if (fallback && imgSrc !== fallback) {
      setImgSrc(fallback);
    } else {
      setImgError(true);
    }
  }

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeLightbox]);

  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 px-4 py-2.5 dark:border-white/[0.06]">
        <ImageIcon className="h-3.5 w-3.5 text-[#FF9900]" strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#FF9900]">
          Photos
        </span>
      </div>

      {/* Image area */}
      <div className="relative flex flex-1 min-h-[260px] items-center justify-center p-6">
        {hasImage ? (
          <div
            className="group relative cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={productName}
              referrerPolicy="no-referrer"
              onError={handleImgError}
              className="h-56 w-56 object-contain transition-transform duration-300 group-hover:scale-105 md:h-64 md:w-64"
            />
            <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Zoom
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
              <svg className="h-10 w-10 text-gray-300 dark:text-white/15" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[11px] uppercase tracking-widest text-gray-300 dark:text-white/20">
              No image
            </span>
            <a
              href={affiliateUrl}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="text-[12px] font-semibold text-[#FF9900] hover:underline"
            >
              View on Amazon →
            </a>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && hasImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={largeUrl || imgSrc}
            alt={productName}
            referrerPolicy="no-referrer"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
