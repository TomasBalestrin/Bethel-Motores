import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  count?: number;
  className?: string;
}

export function LoadingState({ count = 3, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
        >
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
