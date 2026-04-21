import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDateTimeBR,
  formatInteger,
  formatPercent,
} from "@/lib/utils/format";
import type { MentoriaWithMetrics } from "@/types/mentoria";

interface MentoriaCardProps {
  mentoria: MentoriaWithMetrics;
}

interface ProgressRowProps {
  label: string;
  value: number;
  color: string;
  muted?: boolean;
}

function ProgressRow({ label, value, color, muted }: ProgressRowProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-medium",
            muted ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {label}
          {muted ? (
            <span className="ml-1 text-muted-foreground/80">(sem debriefing)</span>
          ) : null}
        </span>
        <span className="font-semibold tabular-nums">{formatPercent(value)}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface MetricTileProps {
  label: string;
  value: string;
}

function MetricTile({ label, value }: MetricTileProps) {
  return (
    <div className="flex flex-col rounded-md bg-muted/50 px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-heading text-sm font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function MentoriaCard({ mentoria }: MentoriaCardProps) {
  const statusLabel =
    mentoria.status === "concluida" ? "Concluída" : "Em andamento";
  const statusClasses =
    mentoria.status === "concluida"
      ? "bg-success/10 text-success border-success/20"
      : "bg-warning/10 text-warning border-warning/20";
  const muted = mentoria.sem_debriefing;

  return (
    <Link
      href={`/motors/mentorias/${mentoria.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <header className="space-y-2">
          <h3 className="font-heading text-base font-semibold tracking-tight line-clamp-2">
            {mentoria.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatDateTimeBR(mentoria.scheduled_at)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={cn("rounded-full border text-[11px]", statusClasses)}
            >
              {statusLabel}
            </Badge>
            {mentoria.specialist ? (
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/10 text-[11px] text-primary"
              >
                {mentoria.specialist.name}
              </Badge>
            ) : null}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            label="Grupo"
            value={formatInteger(mentoria.leads_grupo)}
          />
          <MetricTile
            label="Ao Vivo"
            value={formatInteger(mentoria.leads_ao_vivo)}
          />
          <MetricTile label="Vendas" value={formatInteger(mentoria.vendas)} />
          <MetricTile
            label="Valor Vendas"
            value={formatCurrency(mentoria.valor_vendas)}
          />
        </div>

        <div className="space-y-2">
          <ProgressRow
            label="Comparecimento"
            value={mentoria.pct_comparecimento}
            color="bg-primary"
            muted={muted}
          />
          <ProgressRow
            label="Agendamento"
            value={mentoria.pct_agendamento}
            color="bg-chart-3"
            muted={muted}
          />
          <ProgressRow
            label="Comparecimento Call"
            value={mentoria.pct_comparecimento_call}
            color="bg-accent"
            muted={muted}
          />
          <ProgressRow
            label="Conversão Call"
            value={mentoria.pct_conversao_call}
            color="bg-success"
            muted={muted}
          />
        </div>
      </Card>
    </Link>
  );
}
