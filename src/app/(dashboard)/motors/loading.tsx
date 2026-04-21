import { LoadingState } from "@/components/shared/LoadingState";
import { Skeleton } from "@/components/ui/skeleton";

export default function MotorsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <LoadingState count={3} />
    </div>
  );
}
