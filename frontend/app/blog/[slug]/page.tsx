import { apiFetch } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 1800; // ISR — revalidate every 30 min

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: string;
  createdAt: string;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const post = await apiFetch<BlogPost>(`/blog/${slug}`);
    return buildMetadata({
      title: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.excerpt ?? `Read ${post.title}`,
      path: `/blog/${slug}`
    });
  } catch {
    return buildMetadata({ title: slug, description: `Blog post: ${slug}`, path: `/blog/${slug}` });
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let post: BlogPost | null = null;
  try {
    post = await apiFetch<BlogPost>(`/blog/${slug}`);
  } catch {
    // fallback below
  }

  if (!post) {
    return (
      <article className="prose max-w-none">
        <h1>{slug.replace(/-/g, " ")}</h1>
        <p className="text-slate-500">This post is being generated. Please check back shortly.</p>
      </article>
    );
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt,
    datePublished: post.createdAt,
    author: { "@type": "Organization", name: "AffiliateReviews India" }
  };

  return (
    <article className="max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{post.title}</h1>
        {post.excerpt && <p className="mt-3 text-lg text-slate-500">{post.excerpt}</p>}
        <p className="mt-2 text-sm text-slate-400">{new Date(post.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
      </header>

      <div
        className="prose prose-slate max-w-none prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <footer className="mt-12 border-t border-slate-200 pt-6">
        <p className="text-xs text-slate-400">
          * This page contains affiliate links. As an Amazon Associate, we earn from qualifying purchases at no extra cost to you. Prices shown are approximate and may vary.
        </p>
      </footer>
    </article>
  );
}
