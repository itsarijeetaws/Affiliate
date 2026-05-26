interface SkeletonLoaderProps {
  count?: number;
  variant?: "card" | "text" | "header" | "table-row";
  className?: string;
}

export function SkeletonLoader({
  count = 3,
  variant = "card",
  className = ""
}: SkeletonLoaderProps) {
  const skeletons = Array.from({ length: count });

  if (variant === "card") {
    return (
      <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 ${className}`}>
        {skeletons.map((_, idx) => (
          <div
            key={idx}
            className="rounded-[28px] border border-white/10 bg-white/[0.08] p-6 backdrop-blur-xl"
          >
            <div className="aspect-[4/3] rounded-2xl bg-white/10 animate-pulse" />
            <div className="mt-4 h-6 rounded-lg bg-white/10 animate-pulse" />
            <div className="mt-3 h-4 rounded-lg bg-white/10 animate-pulse w-3/4" />
            <div className="mt-4 flex justify-between">
              <div className="h-5 rounded-lg bg-white/10 animate-pulse w-1/3" />
              <div className="h-5 rounded-lg bg-white/10 animate-pulse w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={`space-y-3 ${className}`}>
        {skeletons.map((_, idx) => (
          <div key={idx} className="h-4 rounded-lg bg-white/10 animate-pulse" />
        ))}
      </div>
    );
  }

  if (variant === "header") {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-8 rounded-lg bg-white/10 animate-pulse w-1/2" />
        <div className="h-4 rounded-lg bg-white/10 animate-pulse w-3/4" />
      </div>
    );
  }

  if (variant === "table-row") {
    return (
      <div className={`space-y-2 ${className}`}>
        {skeletons.map((_, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="h-10 rounded-lg bg-white/10 animate-pulse flex-1" />
            <div className="h-10 rounded-lg bg-white/10 animate-pulse w-24" />
            <div className="h-10 rounded-lg bg-white/10 animate-pulse w-24" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
