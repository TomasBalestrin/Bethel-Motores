import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden h-screen w-[260px] shrink-0 flex-col border-r border-accent/15 bg-primary px-7 py-4 lg:flex">
        <Skeleton className="h-10 w-32 bg-white/10" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full bg-white/10" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-36 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
