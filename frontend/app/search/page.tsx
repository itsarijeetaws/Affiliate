import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Search Products",
  description: "Search affiliate reviews and comparisons.",
  path: "/search"
});

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolved = await searchParams;
  const query = resolved.q || "";

  return (
    <section>
      <h1 className="text-3xl font-bold">Search</h1>
      <form action="/search" className="mt-4 flex max-w-xl gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search products or guides"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <button className="rounded bg-brand-700 px-4 py-2 text-white">Search</button>
      </form>
      {query ? <p className="mt-4 text-slate-600">Search integration can map to `/products` and `/blog` endpoints.</p> : null}
    </section>
  );
}
