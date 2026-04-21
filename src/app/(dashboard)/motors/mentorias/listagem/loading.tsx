import { LoadingState } from "@/components/shared/LoadingState";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListagemLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-44" />
      </div>
      <LoadingState count={6} />
    </div>
  );
}
