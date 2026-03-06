import { ProductCard } from "@/components/ProductCard";
import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";

export const metadata = buildMetadata({
  title: "Best Amazon Product Reviews & Comparisons",
  description: "Explore top-rated products, real pros/cons, and comparison tables."
});

type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  rating: number;
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await apiFetch<{ items: Product[] }>("/products?limit=12");

  return (
    <section>
      <h1 className="text-3xl font-bold text-slate-900">Top Picks This Week</h1>
      <p className="mt-2 text-slate-600">Freshly updated affiliate reviews and pricing snapshots.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  );
}
