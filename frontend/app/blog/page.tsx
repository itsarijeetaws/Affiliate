import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";

export const metadata = buildMetadata({
  title: "Affiliate Blog",
  description: "Guides, comparisons, and product insights.",
  path: "/blog"
});

type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const data = await apiFetch<{ items: Post[] }>("/blog?limit=20");

  return (
    <section>
      <h1 className="text-3xl font-bold">Blog</h1>
      <div className="mt-6 space-y-4">
        {data.items.map((post) => (
          <article key={post.id} className="rounded border border-slate-200 bg-white p-4">
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <p className="mt-1 text-slate-600">{post.excerpt || "Read the full article"}</p>
            <Link href={`/blog/${post.slug}`} className="mt-2 inline-block text-sm font-semibold">
              Read more
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
