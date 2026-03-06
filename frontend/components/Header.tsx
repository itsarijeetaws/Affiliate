import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="container-shell flex items-center justify-between py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          AffiliateLab
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/blog">Blog</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/search">Search</Link>
          <Link href="/admin" className="rounded bg-brand-700 px-3 py-1 text-white hover:bg-brand-900">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
