import { buildMetadata } from "@/lib/seo";
import { Mail, Clock, MessageSquare } from "lucide-react";

export const metadata = buildMetadata({
  title: "Contact Us — BestBuysIndia",
  description: "Get in touch with the BestBuysIndia team for questions, corrections, or partnership enquiries.",
});

// TODO: Replace with real email after domain purchase
const CONTACT_EMAIL = "hello@bestbuysindia.com";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl py-4 space-y-6">

      {/* Header */}
      <div className="rounded-3xl border border-gray-200/80 bg-white px-8 py-10 dark:border-white/[0.07] dark:bg-[#14141c]">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF9900]">
          Get in touch
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Contact Us
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-gray-500 dark:text-white/50">
          Have a question, spotted an error in a review, or want to discuss a partnership? Drop us a message — we read every email.
        </p>
      </div>

      {/* Email card */}
      <div className="rounded-2xl border border-gray-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-[#16161e]">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF9900]/10">
            <Mail className="h-5 w-5 text-[#FF9900]" strokeWidth={2} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-gray-800 dark:text-white/85">Email us</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-1 block text-[15px] font-bold text-[#FF9900] hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>

      {/* Response time */}
      <div className="rounded-2xl border border-gray-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-[#16161e]">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <Clock className="h-5 w-5 text-blue-500" strokeWidth={2} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-gray-800 dark:text-white/85">Response time</p>
            <p className="mt-1 text-[13px] leading-relaxed text-gray-500 dark:text-white/45">
              We aim to respond within <strong className="text-gray-700 dark:text-white/70">1–2 business days</strong>. For urgent corrections to product information, please mention &quot;Correction&quot; in your subject line.
            </p>
          </div>
        </div>
      </div>

      {/* What to write about */}
      <div className="rounded-2xl border border-gray-200/70 bg-white p-6 dark:border-white/[0.07] dark:bg-[#16161e]">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
            <MessageSquare className="h-5 w-5 text-purple-500" strokeWidth={2} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-gray-800 dark:text-white/85">What you can contact us about</p>
            <ul className="mt-3 space-y-2">
              {[
                "Product review corrections or updates",
                "Price discrepancies or broken affiliate links",
                "Suggesting a product or category to review",
                "Partnership or collaboration enquiries",
                "Privacy or data-related requests",
                "General feedback",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-white/45">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF9900]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Note */}
      <p className="text-center text-[12px] text-gray-400 dark:text-white/25 pb-4">
        BestBuysIndia does not provide personal shopping advice or customer support for Amazon orders. For order issues, contact Amazon directly.
      </p>

    </div>
  );
}
