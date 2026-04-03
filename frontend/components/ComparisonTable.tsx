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
    <div className="overflow-x-auto rounded-[28px] border border-white/10 bg-white/[0.08] shadow-[0_24px_80px_rgba(7,10,20,0.28)] backdrop-blur-xl">
      <table className="min-w-full text-left text-sm text-white/80">
        <thead className="bg-white/[0.08] text-white">
          <tr>
            <th className="p-4">Product</th>
            <th className="p-4">Price</th>
            <th className="p-4">Rating</th>
            <th className="p-4">Key Features</th>
            <th className="p-4">Buy</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-white/10">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} width={56} height={56} className="rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-xs text-white/60">N/A</div>
                  )}
                  <span className="font-medium text-white">{item.name}</span>
                </div>
              </td>
              <td className="p-4 text-amber-200">Rs. {Number(item.price).toFixed(0)}</td>
              <td className="p-4">{Number(item.rating).toFixed(1)}</td>
              <td className="p-4 text-white/65">{item.features.join(", ") || "Specs not added yet"}</td>
              <td className="p-4">
                <a href={`/go/${item.slug}`} className="rounded-full border border-amber-300/30 bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200">
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
