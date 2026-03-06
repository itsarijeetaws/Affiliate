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
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Image
        src={imageUrl}
        alt={name}
        width={320}
        height={220}
        loading="lazy"
        className="h-44 w-full rounded object-cover"
      />
      <h3 className="mt-3 text-base font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-600">Rating: {rating.toFixed(1)} / 5</p>
      <p className="mt-1 text-lg font-bold text-brand-700">${price.toFixed(2)}</p>
      <Link href={`/product/${slug}`} className="mt-3 inline-block text-sm font-semibold">
        Read review
      </Link>
    </article>
  );
}
