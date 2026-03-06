import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildMetadata({
    title: `${slug} Buying Guide`,
    description: `Complete buying guide for ${slug}.`,
    path: `/guides/${slug}`
  });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <article className="prose max-w-none">
      <h1>{slug} Buying Guide</h1>
      <p>Use this checklist before purchasing:</p>
      <ul>
        <li>Set budget and use-case first.</li>
        <li>Compare at least 3 products on features and warranty.</li>
        <li>Check updated pricing and stock status.</li>
      </ul>
    </article>
  );
}
