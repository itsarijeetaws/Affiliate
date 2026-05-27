import type { Metadata } from "next";

export const SITE_URL = "https://bestbuysindia.com";
export const SITE_NAME = "BestBuysIndia";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

export function buildMetadata(input: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  noindex?: boolean;
}): Metadata {
  const canonicalUrl = input.path ? `${SITE_URL}${input.path}` : SITE_URL;
  const ogImage = input.image || DEFAULT_OG_IMAGE;

  return {
    title: input.title,
    description: input.description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: input.type ?? "website",
      locale: "en_IN",
      images: [{ url: ogImage, width: 1200, height: 630, alt: input.title }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
    ...(input.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateProductSchema(product: {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  rating: number;
  ratingCount?: number;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "INR",
      url: product.url,
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      bestRating: 5,
      worstRating: 1,
      ratingCount: product.ratingCount || 1,
    },
  };
}
