import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Affiliate Disclosure — BestBuysIndia",
  description: "Affiliate disclosure for BestBuysIndia — how we earn commissions and how it affects our editorial independence.",
});

const UPDATED = "26 May 2025";

export default function DisclosurePage() {
  return (
    <div className="mx-auto max-w-3xl py-4">
      <div className="rounded-3xl border border-gray-200/80 bg-white px-8 py-10 dark:border-white/[0.07] dark:bg-[#14141c]">

        <span className="inline-flex items-center gap-2 rounded-full border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF9900]">
          Legal
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Affiliate Disclosure
        </h1>
        <p className="mt-2 text-[12px] text-gray-400 dark:text-white/30">Last updated: {UPDATED}</p>

        <div className="mt-8 space-y-6 text-[14px] leading-7 text-gray-600 dark:text-white/55">

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">Amazon Associates Program</h2>
            <p>
              BestBuysIndia is a participant in the <strong className="text-gray-800 dark:text-white/85">Amazon Associates Program</strong> (Amazon.in affiliate program), an affiliate advertising programme designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.in.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">How it works</h2>
            <p>
              When you click a product link on this website and subsequently make a qualifying purchase on Amazon.in, we may earn a small commission. <strong className="text-gray-800 dark:text-white/85">This comes at no additional cost to you.</strong> The price you pay on Amazon is exactly the same whether you arrive via our link or directly.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">Editorial independence</h2>
            <p>
              Affiliate commissions do not influence which products we choose to review, the ratings we assign, or the opinions we express. We review products we believe are genuinely useful to Indian consumers. Negative reviews, critical assessments, and low ratings are published without modification regardless of potential commission impact.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">Sponsored content</h2>
            <p>
              BestBuysIndia does not currently publish sponsored product reviews or paid placements. If this changes, any sponsored content will be clearly labelled as such at the top of the relevant page.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">Pricing accuracy</h2>
            <p>
              Product prices displayed on this site are fetched from Amazon.in and updated regularly. However, prices can change at any time. Always verify the final price on Amazon before completing a purchase.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">Questions?</h2>
            <p>
              If you have any questions about this disclosure or how we handle affiliate relationships, please{" "}
              <a href="/contact" className="font-semibold text-[#FF9900] hover:underline">contact us</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
