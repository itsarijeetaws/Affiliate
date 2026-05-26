import { buildMetadata } from "@/lib/seo";
import { ShieldCheck, TrendingDown, RefreshCw, BadgeCheck, Users, Target, Heart } from "lucide-react";

export const metadata = buildMetadata({
  title: "About Us — BestBuysIndia",
  description: "Learn about BestBuysIndia — India's trusted source for honest Amazon product reviews and comparisons.",
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 py-4">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white px-8 py-12 dark:border-white/[0.07] dark:bg-[#14141c]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#FF9900]/[0.07] blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF9900]">
            Our Story
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            About BestBuysIndia
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-gray-500 dark:text-white/50">
            BestBuysIndia was built with one goal — help Indian shoppers make smarter buying decisions on Amazon without wading through fake reviews, inflated prices, or misleading ads.
          </p>
          <p className="mt-3 text-[15px] leading-7 text-gray-500 dark:text-white/50">
            We research, compare, and review products across electronics, fitness, beauty, kitchen, and more — giving you the honest picture so you spend your money wisely.
          </p>
        </div>
      </section>

      {/* What we do */}
      <section>
        <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">What we do</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { Icon: TrendingDown, title: "Live Pricing", desc: "We track real-time Amazon India prices so the numbers you see are always current — no outdated screenshots.", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
            { Icon: ShieldCheck,  title: "Honest Reviews", desc: "We call out the pros and cons. No paid promotions disguised as reviews. If a product has a flaw, we say it.", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
            { Icon: RefreshCw,   title: "Regular Updates", desc: "Products change. Prices drop. New models launch. We keep our reviews up-to-date so you're never working from stale info.", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
            { Icon: BadgeCheck,  title: "Amazon India Only", desc: "Every link goes to Amazon.in. No grey imports, no third-party sellers of dubious origin.", color: "#FF9900", bg: "rgba(255,153,0,0.1)" },
          ].map(({ Icon, title, desc, color, bg }) => (
            <div key={title} className="flex items-start gap-4 rounded-2xl border border-gray-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-[#16161e]">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: bg }}>
                <Icon className="h-5 w-5" style={{ color }} strokeWidth={2} />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-gray-800 dark:text-white/90">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500 dark:text-white/45">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="rounded-3xl border border-[#FF9900]/15 bg-gradient-to-br from-[#FF9900]/[0.05] to-transparent p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF9900]/15">
            <Target className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">Our mission</h2>
            <p className="mt-2 text-[14px] leading-7 text-gray-500 dark:text-white/50">
              To be India&apos;s most trusted product review hub — where every recommendation is backed by research, not a cheque. We believe good information is a public service, and we take that seriously.
            </p>
          </div>
        </div>
      </section>

      {/* Affiliate note */}
      <section className="rounded-2xl border border-gray-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-[#16161e]">
        <div className="flex items-start gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <Heart className="h-4 w-4 text-blue-500" strokeWidth={2} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-gray-800 dark:text-white/85">How we keep the lights on</p>
            <p className="mt-1 text-[13px] leading-relaxed text-gray-500 dark:text-white/45">
              When you buy a product through our links, we may earn a small commission from Amazon at no extra cost to you. This keeps the site running and independent. Our editorial opinions are never influenced by affiliate partnerships.
            </p>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="flex items-start gap-4 rounded-2xl border border-gray-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-[#16161e]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF9900]/10">
          <Users className="h-4 w-4 text-[#FF9900]" strokeWidth={2} />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-gray-800 dark:text-white/85">Get in touch</p>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-500 dark:text-white/45">
            Questions, corrections, or partnership enquiries? Head over to our{" "}
            <a href="/contact" className="font-semibold text-[#FF9900] hover:underline">Contact page</a>.
          </p>
        </div>
      </section>

    </div>
  );
}
