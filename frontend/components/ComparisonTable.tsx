type Item = {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  rating: number;
  features: string[];
  slug: string;
  affiliateUrl: string;
};

function normalizeAmazonImage(url: string): string {
  if (!url) return "";
  if (url.includes("m.media-amazon.com")) return url;
  const m = url.match(/\/images\/I\/([A-Za-z0-9+/]+)\./);
  if (m) return `https://m.media-amazon.com/images/I/${m[1]}._SL500_.jpg`;
  return url;
}

function hasValidImage(imageUrl: string): boolean {
  return Boolean(imageUrl) && !imageUrl.includes("/sample.jpg");
}

export function ComparisonTable({ items }: { items: Item[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#16161e]">
      <table className="min-w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.02]">
            {["Product", "Price", "Rating", "Key Specs", "Buy"].map((h) => (
              <th key={h} className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-white/35">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={item.id}
              className={`border-b border-gray-200 dark:border-white/[0.05] transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${i === items.length - 1 ? "border-none" : ""}`}
            >
              {/* Product */}
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {hasValidImage(item.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={normalizeAmazonImage(item.imageUrl)}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      width={48}
                      height={48}
                      className="h-12 w-12 flex-shrink-0 rounded-lg object-contain bg-gray-100 dark:bg-[#0f0f18] p-1"
                    />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-white/[0.04] text-[10px] text-gray-400 dark:text-white/25">
                      N/A
                    </div>
                  )}
                  <span className="max-w-[180px] font-semibold leading-snug text-gray-700 dark:text-white/85">{item.name}</span>
                </div>
              </td>

              {/* Price */}
              <td className="px-5 py-4 font-bold text-[#FF9900]">
                ₹{Number(item.price).toLocaleString("en-IN")}
              </td>

              {/* Rating */}
              <td className="px-5 py-4">
                <span className="inline-flex items-center gap-1 rounded-md border border-[#FF9900]/20 bg-[#FF9900]/10 px-2.5 py-1 text-[11px] font-bold text-[#FF9900]">
                  {Number(item.rating).toFixed(1)} ★
                </span>
              </td>

              {/* Key specs */}
              <td className="px-5 py-4 max-w-[220px]">
                {item.features.length > 0 ? (
                  <ul className="space-y-0.5">
                    {item.features.slice(0, 3).map((f) => (
                      <li key={f} className="text-gray-500 dark:text-white/45 leading-relaxed">{f}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-400 dark:text-white/25 italic">—</span>
                )}
              </td>

              {/* Buy */}
              <td className="px-5 py-4">
                <a
                  href={item.affiliateUrl || "#"}
                  target="_blank"
                  rel="nofollow sponsored noopener noreferrer"
                  className="btn-orange inline-flex items-center gap-1 rounded-lg px-4 py-2 text-[12px] font-bold"
                >
                  Buy →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
