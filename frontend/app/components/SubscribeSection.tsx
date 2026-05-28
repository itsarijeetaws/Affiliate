"use client";

import { useState, FormEvent } from "react";
import { Bell, Check, AlertTriangle } from "lucide-react";
import { clientFetchJson } from "@/lib/api";

export function SubscribeSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const { ok, data } = await clientFetchJson("/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const msg = typeof data.message === "string"
        ? data.message
        : ok ? "Subscribed successfully!" : "Something went wrong. Try again.";

      setMessage(msg);
      setIsError(!ok);
      if (ok) { setDone(true); setEmail(""); }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#FF9900]/15 bg-gradient-to-br from-[#FF9900]/[0.06] via-[#FF9900]/[0.03] to-transparent p-8 text-center sm:p-12">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#FF9900]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-[#FF9900]/[0.08] blur-2xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FF9900]/25 bg-[#FF9900]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF9900]">
          <Bell className="h-3 w-3" strokeWidth={2.5} />
          Deal Alerts
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Never miss a price drop
        </h2>
        <p className="mt-2 text-[14px] text-gray-500 dark:text-white/45">
          Get notified when prices fall on your favourite products.
        </p>

        {done ? (
          <div className="mx-auto mt-7 flex max-w-md items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-[14px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Check className="h-5 w-5 shrink-0" strokeWidth={2.5} />
            {message}
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mx-auto mt-7 flex max-w-md flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#FF9900]/50 focus:ring-2 focus:ring-[#FF9900]/15 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/30 transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="btn-orange rounded-xl px-5 py-3 text-[13px] font-bold whitespace-nowrap disabled:opacity-60 sm:w-auto w-full"
              >
                {loading ? "…" : "Subscribe"}
              </button>
            </form>

            {message && (
              <div className={`mx-auto mt-3 flex max-w-md items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] ${
                isError
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
              }`}>
                {isError
                  ? <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} />
                  : <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                {message}
              </div>
            )}
          </>
        )}

        <p className="mt-3 text-[11px] text-gray-400 dark:text-white/25">No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  );
}
