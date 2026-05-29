import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";

export const metadata = buildMetadata({
  title: "Buying Guides & Reviews — BestBuysIndia",
  description: "In-depth buying guides, product comparisons, and honest reviews for Indian shoppers.",
  path: "/blog"
});

type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  createdAt?: string;
};

export const revalidate = 3600;

export default async function BlogPage() {
  let posts: Post[] = [];
  try {
    const data = await apiFetch<{ items: Post[] }>("/api/blog?limit=50");
    posts = data.items;
  } catch { /* empty */ }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] px-7 py-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF9900]">Editorial</span>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">Buying Guides & Reviews</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-gray-500 dark:text-white/45">
          Long-form reviews, comparisons, and practical recommendations — designed to help you buy smarter on Amazon India.
        </p>
      </div>

      {/* Posts */}
      {posts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <article key={post.id} className="group rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e] p-5 transition hover:border-white/[0.12] hover:bg-gray-50 dark:hover:bg-[#1c1c28]">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF9900]/70">Review</span>
              <h2 className="mt-2 text-[15px] font-bold leading-snug text-gray-800 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-gray-500 dark:text-white/60">{post.excerpt}</p>
              )}
              <div className="mt-4 flex items-center justify-between">
                {post.createdAt && (
                  <span className="text-[11px] text-gray-400 dark:text-white/45">
                    {new Date(post.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                )}
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-[12px] font-bold text-[#FF9900] hover:text-[#e68a00] transition-colors"
                >
                  Read review →
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/[0.07] p-12 text-center">
          <p className="text-2xl">📝</p>
          <p className="mt-3 text-[14px] text-gray-500 dark:text-white/45">No guides published yet.</p>
          <p className="mt-1 text-[12px] text-gray-400 dark:text-white/30">Generate posts from Admin → Products.</p>
        </div>
      )}
    </div>
  );
}
