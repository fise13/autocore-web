import { Skeleton } from "@/components/ui/skeleton";

export function DashboardShellSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background" data-dashboard-shell-skeleton>
      <div className="flex h-12 items-center gap-3 border-b border-border px-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="ml-auto h-8 w-8 rounded-full" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-56 shrink-0 border-r border-border p-3 md:block">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="min-h-0 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
