import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

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
    const post = await apiFetch<BlogPost>(`/api/blog/${slug}`);
    return buildMetadata({
      title: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.excerpt ?? `Read ${post.title}`,
      path: `/blog/${slug}`
    });
  } catch {
    return buildMetadata({ title: slug, description: `Blog post: ${slug}`, path: `/blog/${slug}` });
  }
}

function cleanContent(html: string): string {
  return html
    .replace(/^```(?:html|markdown|)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let post: BlogPost | null = null;
  try {
    post = await apiFetch<BlogPost>(`/api/blog/${slug}`);
  } catch { /* fallback */ }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[12px] text-gray-400 dark:text-white/35">
          <Link href="/" className="hover:text-[#FF9900] transition-colors">Home</Link>
          <span>›</span>
          <Link href="/blog" className="hover:text-[#FF9900] transition-colors">Guides</Link>
          <span>›</span>
          <span className="text-gray-500 dark:text-white/50">{slug.replace(/-/g, " ")}</span>
        </nav>
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{slug.replace(/-/g, " ")}</h1>
          <p className="mt-3 text-gray-500 dark:text-white/45">This post is being generated. Check back shortly.</p>
        </div>
      </div>
    );
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt,
    datePublished: post.createdAt,
    author: { "@type": "Organization", name: "BestBuysIndia" }
  };

  const cleanHtml = cleanContent(post.content);

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[12px] text-gray-400 dark:text-white/35">
        <Link href="/" className="hover:text-[#FF9900] transition-colors">Home</Link>
        <span>›</span>
        <Link href="/blog" className="hover:text-[#FF9900] transition-colors">Guides</Link>
        <span>›</span>
        <span className="line-clamp-1 text-gray-500 dark:text-white/55">{post.title}</span>
      </nav>

      {/* Header */}
      <header className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] px-7 py-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF9900]">
          Review · BestBuysIndia
        </span>
        <h1 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-gray-900 dark:text-white md:text-3xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-3 text-[14px] leading-7 text-gray-600 dark:text-white/50">{post.excerpt}</p>
        )}
        <div className="mt-4 flex items-center gap-4">
          <p className="text-[11px] text-gray-400 dark:text-white/30">
            {new Date(post.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </p>
          <span className="h-3 w-px bg-gray-300 dark:bg-white/15" />
          <span className="text-[11px] text-gray-400 dark:text-white/30">BestBuysIndia Editorial</span>
        </div>
      </header>

      {/* Content */}
      <div
        className="blog-content rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] px-7 py-8"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />

      {/* Affiliate disclaimer */}
      <footer className="rounded-xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] px-5 py-4">
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-gray-400 dark:text-white/25">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/70" strokeWidth={2} />
          <span>
            <strong className="text-gray-400 dark:text-white/40">Affiliate Disclosure:</strong> This page contains affiliate links.
            As an Amazon Associate, we earn from qualifying purchases at no extra cost to you.
            Prices shown are approximate and may vary.
          </span>
        </p>
      </footer>
    </article>
  );
}
