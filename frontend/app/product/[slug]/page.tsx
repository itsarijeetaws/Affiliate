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

export const revalidate = 3600; // ISR — revalidate every hour

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await apiFetch<Product>(`/products/${slug}`);
    return buildMetadata({
      title: `${product.name} Review — Best Price in India`,
      description: `In-depth ${product.name} review. Price: ₹${Number(product.price).toFixed(0)}, Rating: ${Number(product.rating).toFixed(1)}/5. Is it worth buying in India?`,
      path: `/product/${slug}`
    });
  } catch {
    return buildMetadata({ title: `${slug} Review`, description: `Review for ${slug}`, path: `/product/${slug}` });
  }
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
      ratingValue: Number(product.rating).toFixed(1),
      reviewCount: 1
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: Number(product.price).toFixed(2),
      availability: "https://schema.org/InStock",
      url: product.affiliateUrl
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
        <p className="mt-1 text-slate-600">₹{Number(product.price).toFixed(0)} on Amazon India &nbsp;|&nbsp; ⭐ {Number(product.rating).toFixed(1)}/5</p>
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

      <a href={product.affiliateUrl} target="_blank" rel="nofollow sponsored"
        className="inline-block rounded bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 transition-colors">
        🛒 Buy on Amazon India — ₹{Number(product.price).toFixed(0)}
      </a>

      <p className="text-xs text-slate-400 mt-4">
        * As an Amazon Associate I earn from qualifying purchases. Price and availability may vary.
      </p>
    </article>
  );
}
