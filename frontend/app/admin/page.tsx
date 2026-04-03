import { buildMetadata } from "@/lib/seo";
import { AdminClient } from "./AdminClient";

export const metadata = buildMetadata({
  title: "Admin Dashboard",
  description: "Manage products, categories, and automation jobs.",
  path: "/admin"
});

export default function AdminPage() {
  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">Admin Dashboard</h1>
        <p className="mt-3 text-white/62">Manage products, categories, and automation jobs with clearer visual hierarchy and operational context.</p>
      </div>
      <div className="mt-6">
        <AdminClient />
      </div>
    </section>
  );
}
