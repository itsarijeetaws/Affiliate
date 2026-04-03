import { ComparisonTable } from "@/components/ComparisonTable";
import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";

export const metadata = buildMetadata({
  title: "Product Comparison Tables",
  description: "Compare up to 10 products side-by-side with pricing and features.",
  path: "/compare"
});

type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  rating: number;
  features: Array<{ key: string; value: string }>;
};

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const data = await apiFetch<{ items: Product[] }>("/products?limit=10");

  const items = data.items.map((item) => ({
    ...item,
    features: item.features?.map((f) => `${f.key}: ${f.value}`) ?? []
  }));

  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">Comparison Table</h1>
        <p className="mt-3 max-w-2xl text-white/62">Directly compare pricing, ratings, and key features in a cleaner premium dashboard format.</p>
      </div>
      <div className="mt-6">
        <ComparisonTable items={items} />
      </div>
    </section>
  );
}
