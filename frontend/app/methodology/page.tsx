import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import {
  Target, BarChart2, Scale, Zap, DollarSign, Layers,
  BatteryCharging, Sparkles, CheckCircle2, Clock,
  ShieldCheck, ArrowRight, ThumbsUp, AlertCircle,
} from "lucide-react";

export const metadata = buildMetadata({
  title: "How We Score Products — Our Methodology | BestBuysIndia",
  description:
    "BestBuysIndia Expert Score explained: how we calculate ratings, what each score tier means, and how we pick our recommendations.",
  path: "/methodology",
});

// Mirrors computeExpertScore in product/[slug]/page.tsx
// base = rating × 1.7 | prosBonus up to +0.8 | consPenalty up to −0.6

const VERDICT_TIERS = [
  { score: "9.0 – 10", label: "Editor's Choice",       color: "#22c55e", desc: "Exceptional product that leads its category. Buy with full confidence." },
  { score: "8.0 – 8.9", label: "Highly Recommended",   color: "#FF9900", desc: "Outstanding performance and value — one of the best in its class." },
  { score: "7.0 – 7.9", label: "Recommended",          color: "#3b82f6", desc: "Solid, well-rounded product worth buying if it suits your needs." },
  { score: "5.5 – 6.9", label: "Worth Considering",    color: "#8b5cf6", desc: "Decent option but check alternatives before committing." },
  { score: "0 – 5.4",   label: "Has Better Alternatives", color: "#ef4444", desc: "Several competing products offer better performance or value at this price." },
];

const ASPECT_SCORES = [
  { icon: Zap,            label: "Performance",      desc: "Processor speed, benchmark results, smoothness under load" },
  { icon: DollarSign,     label: "Value for Money",  desc: "Price relative to category average and features offered" },
  { icon: Layers,         label: "Build & Design",   desc: "Materials, finish quality, durability indicators" },
  { icon: BatteryCharging,label: "Battery & Stamina",desc: "Battery life, charge speed, day-to-day endurance" },
  { icon: Sparkles,       label: "Features",         desc: "Breadth of capabilities relative to category expectations" },
];

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 py-4">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white px-8 py-12 dark:border-white/[0.07] dark:bg-[#14141c]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#FF9900]/[0.07] blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF9900]">
            How We Work
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Our Review Methodology
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-gray-500 dark:text-white/50">
            Every product on BestBuysIndia carries an <strong className="text-gray-700 dark:text-white/80">Expert Score</strong> — a
            single number that captures overall quality, value, and user satisfaction. Here&apos;s exactly how it works.
          </p>
        </div>
      </section>

      {/* Expert Score Formula */}
      <section className="rounded-2xl border border-gray-200/70 bg-white dark:border-white/[0.07] dark:bg-[#16161e] overflow-hidden">
        <div className="border-b border-gray-100 dark:border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF9900]/10">
              <Target className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
            </span>
            <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">Expert Score Formula</h2>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5">
          <p className="text-[14px] leading-7 text-gray-600 dark:text-white/55">
            Expert Score is derived from three inputs, all of which come directly from verified Amazon India product data:
          </p>

          {/* Formula visual */}
          <div className="rounded-xl border border-[#FF9900]/20 bg-[#FF9900]/[0.04] p-5 font-mono text-[13px]">
            <p className="text-gray-400 dark:text-white/30 mb-2 font-sans text-[11px] uppercase tracking-widest">Formula</p>
            <p className="text-[#FF9900] font-bold text-[15px]">
              Expert Score = (Rating × 1.7) + Pros Bonus − Cons Penalty
            </p>
            <div className="mt-3 space-y-1 text-[12px] text-gray-500 dark:text-white/40">
              <p>Pros Bonus  = min(0.8,  pros_count / 5 × 0.8)    <span className="text-gray-400 dark:text-white/25">// up to +0.8</span></p>
              <p>Cons Penalty = min(0.6,  cons_count / 4 × 0.6)   <span className="text-gray-400 dark:text-white/25">// up to −0.6</span></p>
              <p>Clamped to 0 – 10</p>
            </div>
          </div>

          {/* Input breakdown */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Base Rating", range: "0 – 5", source: "Amazon India star rating (verified buyers)", weight: "Primary" },
              { label: "Pros Bonus", range: "+0 to +0.8", source: "Count of documented strengths", weight: "Secondary" },
              { label: "Cons Penalty", range: "−0 to −0.6", source: "Count of documented weaknesses", weight: "Secondary" },
            ].map(({ label, range, source, weight }) => (
              <div key={label} className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.02] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF9900]">{weight}</p>
                <p className="mt-1 text-[14px] font-bold text-gray-800 dark:text-white/85">{label}</p>
                <p className="mt-0.5 text-[12px] font-semibold text-gray-500 dark:text-white/40">{range}</p>
                <p className="mt-2 text-[11px] leading-4 text-gray-400 dark:text-white/30">{source}</p>
              </div>
            ))}
          </div>

          <p className="text-[13px] leading-6 text-gray-500 dark:text-white/45">
            A product with a 4.6 Amazon rating, 5 pros, and 2 cons scores:{" "}
            <span className="font-semibold text-gray-700 dark:text-white/70">
              (4.6 × 1.7) + 0.8 − 0.3 = 8.32 → Highly Recommended
            </span>
          </p>
        </div>
      </section>

      {/* Verdict Tiers */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10">
            <BarChart2 className="h-4 w-4 text-blue-500" strokeWidth={2} />
          </span>
          <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">Verdict Tiers</h2>
        </div>

        <div className="space-y-2">
          {VERDICT_TIERS.map(({ score, label, color, desc }) => (
            <div
              key={label}
              className="flex items-start gap-4 rounded-xl border px-5 py-4"
              style={{ borderColor: `${color}25`, background: `${color}06` }}
            >
              <div className="flex min-w-[52px] flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-center"
                style={{ borderColor: `${color}30`, background: `${color}10` }}>
                <span className="text-[11px] font-black leading-none" style={{ color }}>{score}</span>
              </div>
              <div>
                <p className="text-[14px] font-bold" style={{ color }}>{label}</p>
                <p className="mt-0.5 text-[12px] leading-5 text-gray-500 dark:text-white/40">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Aspect Scores */}
      <section className="rounded-2xl border border-gray-200/70 bg-white dark:border-white/[0.07] dark:bg-[#16161e] overflow-hidden">
        <div className="border-b border-gray-100 dark:border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10">
              <Scale className="h-5 w-5 text-purple-500" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">Aspect Score Breakdown</h2>
              <p className="mt-0.5 text-[12px] text-gray-400 dark:text-white/30">
                Each aspect is scored 0–10 based on keyword signals in pros/cons
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
          {ASPECT_SCORES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.04]">
                <Icon className="h-4 w-4 text-gray-500 dark:text-white/40" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-gray-800 dark:text-white/85">{label}</p>
                <p className="text-[12px] text-gray-400 dark:text-white/30">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Buy / Skip Signals */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/15 bg-emerald-50 dark:bg-emerald-500/[0.05] p-5">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsUp className="h-4 w-4 text-emerald-500" strokeWidth={2} />
            <h3 className="text-[14px] font-bold text-emerald-500">Buy If You Are</h3>
          </div>
          <p className="text-[12px] leading-5 text-gray-500 dark:text-white/45">
            Derived from pros content — we detect use-case signals (travel, gaming, photography, budget, etc.) and map
            them to buyer segments. Shown when the product&apos;s documented strengths clearly serve that segment.
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/15 bg-rose-50 dark:bg-rose-500/[0.05] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-rose-400" strokeWidth={2} />
            <h3 className="text-[14px] font-bold text-rose-400">Skip If You Are</h3>
          </div>
          <p className="text-[12px] leading-5 text-gray-500 dark:text-white/45">
            Derived from cons content — we surface documented limitations (battery drain, heavy build, subscription
            required, etc.) and flag them for the buyer segments most likely to be affected.
          </p>
        </div>
      </section>

      {/* Data sources */}
      <section className="rounded-2xl border border-gray-200/70 bg-white dark:border-white/[0.07] dark:bg-[#16161e] overflow-hidden">
        <div className="border-b border-gray-100 dark:border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-500" strokeWidth={2} />
            </span>
            <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">Data Sources &amp; Freshness</h2>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
          {[
            { label: "Prices", detail: "Fetched from Amazon India and updated automatically. Product pages revalidate every 15 minutes via ISR." },
            { label: "Ratings", detail: "Amazon India aggregate star rating from verified buyers at the time of last update." },
            { label: "Pros & Cons", detail: "Research-sourced from product specifications, buyer feedback patterns, and category benchmarks." },
            { label: "Availability", detail: "Products are only listed when in stock and sold by Amazon or fulfilled by Amazon India." },
          ].map(({ label, detail }) => (
            <div key={label} className="flex items-start gap-4 px-6 py-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
              <div>
                <p className="text-[13.5px] font-semibold text-gray-800 dark:text-white/85">{label}</p>
                <p className="mt-0.5 text-[12px] leading-5 text-gray-400 dark:text-white/35">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Price freshness note */}
      <section className="flex items-start gap-4 rounded-2xl border border-gray-200/70 bg-white p-5 dark:border-white/[0.07] dark:bg-[#16161e]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
          <Clock className="h-4 w-4 text-blue-500" strokeWidth={2} />
        </span>
        <div>
          <p className="text-[13.5px] font-semibold text-gray-800 dark:text-white/85">Last Verified Date</p>
          <p className="mt-1 text-[13px] leading-5 text-gray-500 dark:text-white/45">
            Every product page shows a <strong className="text-gray-600 dark:text-white/60">&ldquo;Prices verified&rdquo;</strong> date
            that reflects the last time our system confirmed the price with Amazon India. Always check the final
            price on Amazon before purchasing — prices can change at any time.
          </p>
        </div>
      </section>

      {/* Affiliate independence */}
      <section className="rounded-3xl border border-[#FF9900]/15 bg-gradient-to-br from-[#FF9900]/[0.05] to-transparent p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF9900] mb-3">Editorial Independence</p>
        <p className="text-[14px] leading-7 text-gray-600 dark:text-white/55">
          Affiliate commissions do not influence Expert Scores, verdict tiers, pros/cons lists, or product rankings.
          Products are selected and scored based on research merit alone. Low-scoring products remain published — we
          don&apos;t suppress negative assessments.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/disclosure" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#FF9900] hover:underline">
            Affiliate Disclosure <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/about" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 dark:text-white/40 hover:text-[#FF9900] hover:underline transition-colors">
            About Us <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

    </div>
  );
}
