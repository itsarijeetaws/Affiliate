import { SeoJsonLd } from "@/components/SeoJsonLd";
import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  rating: number;
  imageUrl: string;
  description: string;
  pros: string[];
  cons: string[];
  affiliateUrl: string;
  features: Array<{ id: number; key: string; value: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildMetadata({
    title: `${slug} Review`,
    description: `In-depth review, pros and cons, and buying advice for ${slug}.`,
    path: `/product/${slug}`
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await apiFetch<Product>(`/products/${slug}`);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.imageUrl,
    description: product.description,
    sku: product.slug,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: 1
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: product.price,
      availability: "https://schema.org/InStock"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${product.name} worth buying?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "If you need strong overall value, this product is worth considering."
        }
      }
    ]
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.example.com" },
      { "@type": "ListItem", position: 2, name: "Product", item: `https://www.example.com/product/${product.slug}` }
    ]
  };

  return (
    <article className="space-y-6">
      <SeoJsonLd data={productSchema} />
      <SeoJsonLd data={faqSchema} />
      <SeoJsonLd data={breadcrumbSchema} />

      <header>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="mt-1 text-slate-600">Current price: ${Number(product.price).toFixed(2)} | Rating: {Number(product.rating).toFixed(1)}</p>
      </header>

      <p>{product.description}</p>

      <section>
        <h2 className="text-xl font-semibold">Key Features</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
          {product.features.map((feature) => (
            <li key={feature.id}>
              <strong>{feature.key}:</strong> {feature.value}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-emerald-700">Pros</h2>
          <ul className="mt-2 list-disc pl-5 text-slate-700">
            {product.pros.map((pro) => (
              <li key={pro}>{pro}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-rose-700">Cons</h2>
          <ul className="mt-2 list-disc pl-5 text-slate-700">
            {product.cons.map((con) => (
              <li key={con}>{con}</li>
            ))}
          </ul>
        </div>
      </section>

      <a href={`/go/${product.slug}`} className="inline-block rounded bg-brand-700 px-5 py-3 font-semibold text-white">
        Buy on Amazon
      </a>
    </article>
  );
}
