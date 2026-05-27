"use client";

export function MotorsGridSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card" aria-hidden>
      <div className="grid grid-cols-8 gap-px border-b bg-muted/40 px-2 py-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={`head-${index}`} className="h-4 animate-pulse rounded bg-muted/80" />
        ))}
      </div>
      <div className="flex-1 space-y-px overflow-hidden p-0">
        {Array.from({ length: 14 }).map((_, row) => (
          <div
            key={`row-${row}`}
            className="grid grid-cols-8 gap-px border-b border-border/40 px-2 py-2.5"
            style={{ animationDelay: `${row * 35}ms` }}
          >
            {Array.from({ length: 8 }).map((__, col) => (
              <div
                key={`cell-${row}-${col}`}
                className="h-3 animate-pulse rounded bg-muted/50"
                style={{ opacity: 1 - row * 0.04 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
