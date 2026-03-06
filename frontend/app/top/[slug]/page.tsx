import { ProductCard } from "@/components/ProductCard";
import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildMetadata({
    title: `Top 10 ${slug}`,
    description: `Best ${slug} products ranked with comparisons and quick buy links.`,
    path: `/top/${slug}`
  });
}

type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  rating: number;
};

export const dynamic = "force-dynamic";

export default async function TopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await apiFetch<{ items: Product[] }>("/products?limit=10");

  return (
    <section>
      <h1 className="text-3xl font-bold">Top 10 {slug} Products</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item) => (
          <ProductCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
}
