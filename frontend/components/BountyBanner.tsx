/**
 * BountyBanner — "Recommended Amazon Services" section on homepage.
 * Uses Amazon Associates bounty links to earn fixed INR per signup.
 * Links use partner tag from env (NEXT_PUBLIC_AMAZON_TAG) with fallback.
 */

const PARTNER_TAG = process.env.NEXT_PUBLIC_AMAZON_TAG ?? "adfirststore-21";

const SERVICES = [
  {
    icon: "👑",
    title: "Amazon Prime",
    tagline: "Free 30-day trial",
    description:
      "Free same-day & next-day delivery, Prime Video, Prime Music, exclusive deals. India's best shopping subscription.",
    cta: "Start Free Trial",
    href: `https://www.amazon.in/tryprime?tag=${PARTNER_TAG}`,
    accent: "#FF9900",
    bg: "rgba(255,153,0,0.08)",
    border: "rgba(255,153,0,0.2)",
  },
  {
    icon: "🎧",
    title: "Audible",
    tagline: "Free trial available",
    description:
      "India's largest audiobook library. Listen to bestsellers, podcasts, and Audible Originals anytime, anywhere.",
    cta: "Try Audible Free",
    href: `https://www.amazon.in/dp/B077S5CVBQ/?ref=assoc_tag_sept19&actioncode=AINOTH066082819002X&tag=${PARTNER_TAG}`,
    accent: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
  },
  {
    icon: "🏪",
    title: "Sell on Amazon",
    tagline: "Reach crore+ customers",
    description:
      "List your products on Amazon India. Start your seller account with zero listing fees and grow your business online.",
    cta: "Start Selling",
    href: `https://services.amazon.in/services/sell-on-amazon/become-a-seller.html?tag=${PARTNER_TAG}`,
    accent: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    icon: "💼",
    title: "Amazon Business",
    tagline: "For businesses & GST buyers",
    description:
      "Business-only pricing, GST invoices, multi-user accounts, and approval workflows. Perfect for offices and SMBs.",
    cta: "Register Free",
    href: `https://www.amazon.in/tryAB?tag=${PARTNER_TAG}`,
    accent: "#6366f1",
    bg: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.2)",
  },
];

export function BountyBanner() {
  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="section-title text-gray-900 dark:text-white">
            Amazon Services Worth Trying
          </h2>
          <p className="mt-0.5 text-[12.5px] text-gray-400 dark:text-white/30">
            Exclusive offers & free trials for Amazon India
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((s) => (
          <a
            key={s.title}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group flex flex-col gap-3 rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-white dark:bg-[#16161e]"
            style={{
              borderColor: s.border,
              backgroundColor: undefined,
            }}
          >
            {/* Icon + title */}
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition-all duration-200 group-hover:scale-110"
                style={{ background: s.bg }}
              >
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-gray-900 dark:text-white">{s.title}</p>
                <p
                  className="mt-0.5 text-[11px] font-semibold"
                  style={{ color: s.accent }}
                >
                  {s.tagline}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="flex-1 text-[12.5px] leading-relaxed text-gray-500 dark:text-white/45">
              {s.description}
            </p>

            {/* CTA */}
            <span
              className="inline-flex items-center gap-1 self-start rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 group-hover:gap-2"
              style={{ background: s.bg, color: s.accent }}
            >
              {s.cta}
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </span>
          </a>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-gray-400 dark:text-white/20 text-center">
        * As an Amazon Associate we earn from qualifying purchases and service referrals. Terms apply.
      </p>
    </section>
  );
}
