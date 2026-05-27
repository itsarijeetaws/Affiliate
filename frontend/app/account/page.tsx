import { buildMetadata } from "@/lib/seo";
import { AccountClient } from "./AccountClient";

export const metadata = buildMetadata({
  title: "Account",
  description: "Register, log in, and access your account.",
  path: "/account",
  noindex: true,
});

export default function AccountPage() {
  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-7">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account</h1>
        <p className="mt-2 text-[14px] text-gray-500 dark:text-white/50">
          Register or sign in to manage your account. Admin tools unlock only for approved email addresses.
        </p>
      </div>
      <AccountClient />
    </section>
  );
}
