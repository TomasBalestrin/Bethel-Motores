import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import type {
  PlatformBreakdown,
  TrafegoPlatform,
} from "@/services/mentorias.service";
import { TrafegoBudgetEditor } from "./TrafegoBudgetEditor";

interface TrafegoBudgetBreakdownProps {
  mentoriaId: string;
  platforms: PlatformBreakdown[];
  totalInvestido: number;
  totalBudget: number;
}

const PLATFORM_LABELS: Record<TrafegoPlatform, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok: "TikTok",
  youtube: "YouTube",
  outro: "Outro",
};

const PLATFORM_DOT: Record<TrafegoPlatform, string> = {
  meta_ads: "bg-blue-500",
  google_ads: "bg-amber-500",
  tiktok: "bg-foreground",
  youtube: "bg-red-500",
  outro: "bg-muted-foreground",
};

function progressColor(pct: number, excedeu: boolean): string {
  if (excedeu || pct >= 90) return "bg-destructive";
  if (pct >= 70) return "bg-warning";
  return "bg-success";
}

function textColor(pct: number, excedeu: boolean): string {
  if (excedeu || pct >= 90) return "text-destructive";
  if (pct >= 70) return "text-warning";
  return "text-success";
}

export function TrafegoBudgetBreakdown({
  mentoriaId,
  platforms,
  totalInvestido,
  totalBudget,
}: TrafegoBudgetBreakdownProps) {
  const hasBudget = totalBudget > 0;
  const totalPct = hasBudget ? (totalInvestido / totalBudget) * 100 : 0;
  const totalExcedeu = hasBudget && totalInvestido > totalBudget;
  const activePlatforms = platforms.filter((p) => p.spent > 0 || p.budget > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Orçamento
        </span>
        <TrafegoBudgetEditor mentoriaId={mentoriaId} current={platforms} />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {hasBudget ? (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-heading text-xl font-semibold tabular-nums">
                {formatCurrency(totalInvestido)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                / {formatCurrency(totalBudget)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  progressColor(totalPct, totalExcedeu)
                )}
                style={{ width: `${Math.min(100, totalPct)}%` }}
              />
            </div>
            <div
              className={cn(
                "text-[11px] font-semibold tabular-nums",
                textColor(totalPct, totalExcedeu)
              )}
            >
              {totalPct.toFixed(1)}%{" "}
              <span className="font-normal text-muted-foreground">
                {totalExcedeu
                  ? `(excedeu ${formatCurrency(totalInvestido - totalBudget)})`
                  : `(resta ${formatCurrency(totalBudget - totalInvestido)})`}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-heading text-xl font-semibold text-muted-foreground">
              Não definido
            </p>
            <p className="text-xs text-muted-foreground">
              Clique no lápis acima para definir orçamentos por plataforma.
            </p>
          </div>
        )}

        {activePlatforms.length > 0 ? (
          <div className="space-y-1.5 border-t border-border pt-2">
            {activePlatforms.map((p) => {
              const pct = p.budget > 0 ? (p.spent / p.budget) * 100 : null;
              const excedeu = p.budget > 0 && p.spent > p.budget;
              return (
                <div key={p.platform} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          PLATFORM_DOT[p.platform]
                        )}
                      />
                      <span>{PLATFORM_LABELS[p.platform]}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(p.spent)}
                      {p.budget > 0 ? ` / ${formatCurrency(p.budget)}` : ""}
                      {pct !== null ? (
                        <span
                          className={cn(
                            "ml-1 font-semibold",
                            textColor(pct, excedeu)
                          )}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {p.budget > 0 ? (
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          progressColor(pct ?? 0, excedeu)
                        )}
                        style={{ width: `${Math.min(100, pct ?? 0)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
