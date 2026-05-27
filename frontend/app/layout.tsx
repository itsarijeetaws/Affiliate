import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/Header";
import Link from "next/link";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/seo";

const GA_ID = "G-W39GB2DXXT";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Best Amazon Deals & Reviews India`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Expert reviews, live Amazon pricing, and honest comparisons for Indian shoppers. Find the best products with real ratings and prices.",
  keywords: [
    "best products India",
    "Amazon India deals",
    "product reviews India",
    "buy online India",
    "price comparison India",
    "top rated products India",
    "Amazon deals today",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Best Amazon Deals & Reviews India`,
    description:
      "Expert reviews, live Amazon pricing, and honest comparisons for Indian shoppers.",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Best Amazon Deals & Reviews India`,
    description:
      "Expert reviews, live Amazon pricing, and honest comparisons for Indian shoppers.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  verification: { google: "szdrtw3pp5JCxx8S4dB27s0Gf2_yRj-paiR1gmUJvRk" },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: "Expert Amazon product reviews, price comparisons and buying guides for Indian shoppers.",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  contactPoint: { "@type": "ContactPoint", email: "hello@bestbuysindia.com", contactType: "customer service" },
};

const FOOTER_CATEGORIES = [
  { name: "Electronics", slug: "electronics" },
  { name: "Smartphones", slug: "smartphones" },
  { name: "Laptops", slug: "laptops" },
  { name: "Audio", slug: "home-audio" },
  { name: "Home & Kitchen", slug: "kitchen-appliances" },
  { name: "Headphones", slug: "headphones" },
  { name: "Gaming", slug: "gaming" },
  { name: "Smartwatches", slug: "smartwatches" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        {/* Anti-flash: read theme from localStorage before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':true;if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`
          }}
        />

        {/* Structured data — WebSite + Organization */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      </head>
      <body className="bg-gray-100 text-gray-900 dark:bg-[#0d0d12] dark:text-[#e8e8ee]">

        <Header />

        <main className="container-shell py-8">{children}</main>

        {/* ── Footer ── */}
        <footer className="mt-20 border-t border-gray-200 bg-gray-900 dark:border-white/[0.07] dark:bg-[#0b0b10]">
          <div className="container-shell py-14">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

              {/* Brand */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF9900] text-[12px] font-black text-black">B</span>
                  <span className="text-[15px] font-bold tracking-tight text-white">
                    Best<span className="text-[#FF9900]">Buys</span>India
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-gray-400">
                  Expert product reviews, live Amazon pricing, and honest comparisons for Indian shoppers.
                </p>
                <p className="text-[11px] text-gray-500">
                  As an Amazon Associate we earn from qualifying purchases.
                </p>
              </div>

              {/* Categories */}
              <div>
                <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Top Categories</h3>
                <ul className="space-y-2.5">
                  {FOOTER_CATEGORIES.slice(0, 6).map((c) => (
                    <li key={c.slug}>
                      <Link href={`/category/${c.slug}`} className="text-[13px] text-gray-400 hover:text-[#FF9900] transition-colors">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick links */}
              <div>
                <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Quick Links</h3>
                <ul className="space-y-2.5">
                  {[
                    { label: "All Reviews", href: "/search" },
                    { label: "Compare Products", href: "/compare" },
                    { label: "Buying Guides", href: "/blog" },
                    { label: "Best Sellers", href: "/search?q=best" },
                  ].map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-[13px] text-gray-400 hover:text-[#FF9900] transition-colors">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Information</h3>
                <ul className="space-y-2.5">
                  {[
                    { label: "About Us", href: "/about" },
                    { label: "Affiliate Disclosure", href: "/disclosure" },
                    { label: "Privacy Policy", href: "/privacy" },
                    { label: "Contact", href: "/contact" },
                  ].map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-[13px] text-gray-400 hover:text-[#FF9900] transition-colors">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-gray-700 pt-8 text-center sm:flex-row">
              <p className="text-[12px] text-gray-500">&copy; {new Date().getFullYear()} BestBuysIndia. All rights reserved.</p>
              <p className="text-[12px] text-gray-500">Prices approximate. Verify on Amazon before purchase.</p>
            </div>
          </div>
        </footer>

        {/* Google Analytics GA4 — loads after page is interactive, doesn't block render */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { page_path: window.location.pathname });
          `}
        </Script>

      </body>
    </html>
  );
}
