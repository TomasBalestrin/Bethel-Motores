import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoalProgress } from "./GoalProgress";
import type { GoalState } from "@/types/common";

export type MetricFormat = "integer" | "decimal" | "currency" | "percent";

interface MetricCardProps {
  label: string;
  value: number;
  format?: MetricFormat;
  delta?: number | null;
  goal?: GoalState | null;
  className?: string;
}

function formatValue(value: number, format: MetricFormat): string {
  switch (format) {
    case "currency":
      return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      });
    case "decimal":
      return value.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
    case "percent":
      return `${value.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}%`;
    case "integer":
    default:
      return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  }
}

function goalFormatterFor(format: MetricFormat): ((value: number) => string) | undefined {
  if (format === "currency" || format === "decimal" || format === "percent") {
    return (value: number) => formatValue(value, format);
  }
  return undefined;
}

export function MetricCard({
  label,
  value,
  format = "integer",
  delta,
  goal,
  className,
}: MetricCardProps) {
  const hasDelta = typeof delta === "number" && !Number.isNaN(delta);
  const direction =
    !hasDelta || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const DeltaIcon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : ArrowRight;

  return (
    <Card className={cn("flex flex-col gap-3", className)}>
      <CardHeader className="pb-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-heading text-2xl font-semibold tracking-tight">
            {formatValue(value, format)}
          </span>
          {hasDelta ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                direction === "up" && "bg-success/10 text-success",
                direction === "down" && "bg-destructive/10 text-destructive",
                direction === "flat" && "bg-muted text-muted-foreground"
              )}
            >
              <DeltaIcon className="h-3 w-3" aria-hidden />
              {Math.abs(delta!).toFixed(1)}%
            </span>
          ) : null}
        </div>
        {goal ? (
          <GoalProgress
            target={goal.target}
            achieved={goal.achieved}
            format={goalFormatterFor(format)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
