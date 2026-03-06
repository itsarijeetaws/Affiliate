type JsonLd = Record<string, unknown>;

export function SeoJsonLd({ data }: { data: JsonLd }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
