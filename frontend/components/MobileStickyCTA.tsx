"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";

type Props = {
  name: string;
  price: number;
  affiliateUrl: string;
};

export function MobileStickyCTA({ name, price, affiliateUrl }: Props) {
  const [visible, setVisible] = useState(false);
  const heroVisibleRef = useRef(true);
  const bottomVisibleRef = useRef(false);
  const p = Number(price);

  useEffect(() => {
    const heroCta = document.getElementById("hero-cta");
    const bottomCta = document.getElementById("bottom-cta");

    function update() {
      setVisible(!heroVisibleRef.current && !bottomVisibleRef.current);
    }

    const heroObs = new IntersectionObserver(
      ([entry]) => {
        heroVisibleRef.current = entry.isIntersecting;
        update();
      },
      { threshold: 0 }
    );

    const bottomObs = new IntersectionObserver(
      ([entry]) => {
        bottomVisibleRef.current = entry.isIntersecting;
        update();
      },
      { threshold: 0.5 }
    );

    if (heroCta) heroObs.observe(heroCta);
    if (bottomCta) bottomObs.observe(bottomCta);

    return () => {
      heroObs.disconnect();
      bottomObs.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/80 bg-white/95 backdrop-blur-md px-4 py-3 dark:border-white/[0.08] dark:bg-[#0d0d12]/95 transition-transform duration-300 ease-in-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="truncate text-[12px] font-semibold text-gray-800 dark:text-white/85 leading-tight">
            {name}
          </p>
          {p > 0 && (
            <p className="text-[15px] font-extrabold leading-tight text-[#FF9900]">
              ₹{p.toLocaleString("en-IN")}
            </p>
          )}
        </div>
        <a
          href={affiliateUrl}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#FF9900] to-[#e68a00] px-4 py-2.5 text-[13px] font-bold text-black shadow-[0_2px_12px_rgba(255,153,0,0.3)] active:scale-95 transition-transform"
        >
          <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.5} />
          Buy on Amazon
        </a>
      </div>
    </div>
  );
}
