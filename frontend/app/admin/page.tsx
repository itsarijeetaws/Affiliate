import { buildMetadata } from "@/lib/seo";
import { AdminDashboard } from "./AdminDashboard";

export const metadata = buildMetadata({
  title: "Admin Dashboard",
  description: "Manage products, categories, and automation jobs.",
  path: "/admin"
});

export default function AdminPage() {
  return (
    <section className="space-y-8">
      <div className="rounded-xl border border-white/[0.07] bg-[#16161e] p-7">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF9900]">Control Panel</span>
        <h1 className="mt-1 text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="mt-1.5 text-[14px] text-white/45">Manage products, categories, and automation jobs.</p>
      </div>
      <div className="mt-6">
        <AdminDashboard />
      </div>
    </section>
  );
}
