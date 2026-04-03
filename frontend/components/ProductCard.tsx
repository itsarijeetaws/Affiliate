import Image from "next/image";
import Link from "next/link";

type Props = {
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  rating: number;
};

export function ProductCard({ name, slug, imageUrl, price, rating }: Props) {
  return (
    <article className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.08] p-4 shadow-[0_24px_80px_rgba(7,10,20,0.28)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-amber-200/40 hover:bg-white/[0.11]">
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            width={320}
            height={220}
            loading="lazy"
            className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-52 w-full items-center justify-center text-sm text-white/60">
            Image coming soon
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="rounded-full border border-white/15 bg-slate-950/70 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur">
            Amazon India
          </span>
          <span className="rounded-full border border-amber-300/25 bg-amber-300/15 px-3 py-1 text-xs font-semibold text-amber-100">
            {Number(rating).toFixed(1)} / 5
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold leading-snug text-white">{name}</h3>
          <p className="mt-2 text-sm text-white/62">Reviewed, compared, and tracked for current Amazon pricing.</p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">Live Price</p>
            <p className="text-2xl font-bold text-amber-200">Rs. {Number(price).toFixed(0)}</p>
          </div>
          <Link href={`/product/${slug}`} className="rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200">
            View review
          </Link>
        </div>
      </div>
    </article>
  );
}
