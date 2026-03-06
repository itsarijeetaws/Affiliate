import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildMetadata({
    title: `${slug} Blog Post`,
    description: "Detailed blog content",
    path: `/blog/${slug}`
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <article className="prose max-w-none">
      <h1>{slug.replace(/-/g, " ")}</h1>
      <p>This page is connected to your backend blog endpoint and can be extended to fetch full HTML content.</p>
    </article>
  );
}
