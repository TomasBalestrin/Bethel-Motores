import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

interface TrafegoBudgetCardProps {
  investido: number;
  budget: number | null;
}

export function TrafegoBudgetCard({ investido, budget }: TrafegoBudgetCardProps) {
  if (!budget || budget <= 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Orçamento
          </span>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-2 pt-0">
          <p className="font-heading text-xl font-semibold tabular-nums text-muted-foreground">
            Não definido
          </p>
          <p className="text-xs text-muted-foreground">
            Defina um orçamento na edição da mentoria
          </p>
        </CardContent>
      </Card>
    );
  }

  const pct = (investido / budget) * 100;
  const clampedPct = Math.min(100, Math.max(0, pct));
  const restante = Math.max(0, budget - investido);
  const estouro = investido > budget;

  const color = estouro
    ? "bg-destructive"
    : pct >= 90
      ? "bg-destructive"
      : pct >= 70
        ? "bg-warning"
        : "bg-success";
  const textColor = estouro
    ? "text-destructive"
    : pct >= 90
      ? "text-destructive"
      : pct >= 70
        ? "text-warning"
        : "text-success";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Orçamento
        </span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-2 pt-0">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-heading text-xl font-semibold tabular-nums">
              {formatCurrency(investido)}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              / {formatCurrency(budget)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", color)}
              style={{ width: `${clampedPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className={cn("font-semibold tabular-nums", textColor)}>
              {pct.toFixed(1)}%
            </span>
            <span className="text-muted-foreground tabular-nums">
              {estouro
                ? `Excedeu ${formatCurrency(investido - budget)}`
                : `Resta ${formatCurrency(restante)}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
