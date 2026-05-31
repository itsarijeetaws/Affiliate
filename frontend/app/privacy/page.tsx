import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy Policy — BestBuysIndia",
  description: "Privacy policy for BestBuysIndia — what data we collect, how we use it, and your rights.",
});

const UPDATED = "31 May 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl py-4">
      <div className="rounded-3xl border border-gray-200/80 bg-white px-8 py-10 dark:border-white/[0.07] dark:bg-[#14141c]">

        <span className="inline-flex items-center gap-2 rounded-full border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF9900]">
          Legal
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="mt-2 text-[12px] text-gray-400 dark:text-white/30">Last updated: {UPDATED}</p>

        <div className="mt-8 space-y-6 text-[14px] leading-7 text-gray-600 dark:text-white/55">

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">1. Who we are</h2>
            <p>
              BestBuysIndia (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the website BestBuysIndia.com. This policy explains what personal data we collect, why, and how it is used.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">2. Data we collect</h2>
            <ul className="mt-2 space-y-2 pl-4">
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF9900]" /><span><strong className="text-gray-800 dark:text-white/85">Usage data</strong> — pages visited, time on site, referring URL, browser type, and device type. Collected via anonymised analytics to improve the site.</span></li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF9900]" /><span><strong className="text-gray-800 dark:text-white/85">Click data</strong> — when you click an affiliate link, we log the product clicked and timestamp. No personal identifiers are stored alongside this data.</span></li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF9900]" /><span><strong className="text-gray-800 dark:text-white/85">Email address</strong> — only if you subscribe to our deal alerts newsletter. You can unsubscribe at any time.</span></li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF9900]" /><span><strong className="text-gray-800 dark:text-white/85">Contact form data</strong> — name and email address if you contact us. Used solely to respond to your enquiry.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">3. How we use your data</h2>
            <ul className="mt-2 space-y-1 pl-4 list-disc list-inside">
              <li>To improve site content and user experience</li>
              <li>To send deal alert emails (newsletter subscribers only)</li>
              <li>To respond to contact enquiries</li>
              <li>To monitor and fix technical issues</li>
            </ul>
            <p className="mt-3">We do <strong className="text-gray-800 dark:text-white/85">not</strong> sell personal data to third parties.</p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">4. Cookies</h2>
            <p>
              We use minimal, functional cookies to operate the site (e.g. authentication tokens for admin users). We do not use advertising or tracking cookies. Third-party services such as Amazon may set their own cookies when you click through to their site — please refer to Amazon&apos;s own privacy policy for details.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">5. Third-party services</h2>
            <p>
              We participate in the Amazon Associates Program. When you visit Amazon via our affiliate links, Amazon&apos;s privacy policy governs any data Amazon collects. We are not responsible for Amazon&apos;s data practices.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">6. Data retention</h2>
            <p>
              Anonymised analytics data is retained for up to 24 months. Email addresses for newsletter subscribers are retained until you unsubscribe. Contact form submissions are retained for up to 6 months.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">7. Your rights</h2>
            <p>You have the right to:</p>
            <ul className="mt-2 space-y-1 pl-4 list-disc list-inside">
              <li>Request access to personal data we hold about you</li>
              <li>Request correction or deletion of your data</li>
              <li>Withdraw consent (e.g. unsubscribe from newsletter) at any time</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, <a href="/contact" className="font-semibold text-[#FF9900] hover:underline">contact us</a>.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">8. Security</h2>
            <p>
              We use HTTPS encryption and follow standard security practices to protect your data. No method of transmission over the internet is 100% secure, but we take reasonable precautions.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">9. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The &quot;Last updated&quot; date at the top of this page reflects the most recent revision. Continued use of the site after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-gray-900 dark:text-white">10. Contact</h2>
            <p>
              Privacy-related questions can be sent via our{" "}
              <a href="/contact" className="font-semibold text-[#FF9900] hover:underline">contact page</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
