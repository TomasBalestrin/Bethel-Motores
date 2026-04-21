import { cn } from "@/lib/utils";

interface GoalProgressProps {
  target: number;
  achieved: number;
  format?: (value: number) => string;
  className?: string;
}

export function GoalProgress({
  target,
  achieved,
  format,
  className,
}: GoalProgressProps) {
  const pct =
    target <= 0 ? 0 : Math.min(100, Math.round((achieved / target) * 100));

  const barColor =
    pct >= 100
      ? "bg-success"
      : pct >= 60
        ? "bg-primary"
        : pct >= 30
          ? "bg-warning"
          : "bg-destructive";

  const achievedLabel = format ? format(achieved) : achieved.toLocaleString("pt-BR");
  const targetLabel = format ? format(target) : target.toLocaleString("pt-BR");

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Meta</span>
        <span className="font-medium text-foreground">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{achievedLabel}</span>
        <span>{targetLabel}</span>
      </div>
    </div>
  );
}
