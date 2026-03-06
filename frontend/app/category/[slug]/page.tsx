import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildMetadata({
    title: `Best ${slug} Products`,
    description: `Browse top ${slug} products with detailed reviews.`,
    path: `/category/${slug}`
  });
}

type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  rating: number;
  category: { slug: string };
};

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await apiFetch<{ items: Product[] }>("/products?limit=50");
  const products = data.items.filter((p) => p.category.slug === slug);

  return (
    <section>
      <h1 className="text-3xl font-bold capitalize">{slug} Reviews</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  );
}
