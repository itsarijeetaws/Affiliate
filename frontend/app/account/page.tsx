import { buildMetadata } from "@/lib/seo";
import { AccountClient } from "./AccountClient";

export const metadata = buildMetadata({
  title: "Account",
  description: "Register, log in, and access your account.",
  path: "/account"
});

export default function AccountPage() {
  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">Account</h1>
        <p className="mt-3 max-w-2xl text-white/62">
          Register or log in to manage your account. Admin tools appear only for approved admin email addresses.
        </p>
      </div>
      <AccountClient />
    </section>
  );
}
