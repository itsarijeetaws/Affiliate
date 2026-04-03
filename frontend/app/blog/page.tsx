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
  const data = await apiFetch<{ items: Post[] }>("/api/blog?limit=20");

  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">Buying Guides</h1>
        <p className="mt-3 max-w-2xl text-white/62">Long-form reviews, comparisons, and practical recommendations designed to feel editorial instead of generic.</p>
      </div>
      <div className="space-y-4">
        {data.items.map((post) => (
          <article key={post.id} className="rounded-[28px] border border-white/10 bg-white/[0.08] p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-white">{post.title}</h2>
            <p className="mt-2 text-white/62">{post.excerpt || "Read the full article"}</p>
            <Link href={`/blog/${post.slug}`} className="mt-4 inline-block text-sm font-semibold text-amber-200">
              Read more
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
