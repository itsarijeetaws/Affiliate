import { buildMetadata } from "@/lib/seo";
import { AdminClient } from "./AdminClient";

export const metadata = buildMetadata({
  title: "Admin Dashboard",
  description: "Manage products, categories, and automation jobs.",
  path: "/admin"
});

export default function AdminPage() {
  return (
    <section>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="mt-2 text-slate-600">Secure JWT-based admin operations.</p>
      <div className="mt-6">
        <AdminClient />
      </div>
    </section>
  );
}
