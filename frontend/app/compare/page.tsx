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
    <section>
      <h1 className="text-3xl font-bold">Comparison Table</h1>
      <p className="mt-2 text-slate-600">Directly compare features, ratings, and pricing.</p>
      <div className="mt-6">
        <ComparisonTable items={items} />
      </div>
    </section>
  );
}
