import Image from "next/image";

type Item = {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  rating: number;
  features: string[];
  slug: string;
};

export function ComparisonTable({ items }: { items: Item[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="p-3">Product</th>
            <th className="p-3">Price</th>
            <th className="p-3">Rating</th>
            <th className="p-3">Key Features</th>
            <th className="p-3">Buy</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-slate-200">
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <Image src={item.imageUrl} alt={item.name} width={56} height={56} className="rounded object-cover" />
                  <span>{item.name}</span>
                </div>
              </td>
              <td className="p-3">${item.price.toFixed(2)}</td>
              <td className="p-3">{item.rating.toFixed(1)}</td>
              <td className="p-3">{item.features.join(", ")}</td>
              <td className="p-3">
                <a href={`/go/${item.slug}`} className="rounded bg-brand-700 px-3 py-2 text-xs font-semibold text-white">
                  Buy on Amazon
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
