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
  const products = data.items.filter((p) => p.category?.slug === slug);

  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold capitalize text-white">{slug} Reviews</h1>
        <p className="mt-3 text-white/62">Curated picks and product pages for this category.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  );
}
