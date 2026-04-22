import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { formatCurrency, formatDateTimeBR } from "@/lib/utils/format";
import type { MentoriaWithMetrics } from "@/types/mentoria";
import { MentoriaMetricsDrawer } from "./MentoriaMetricsDrawer";

interface MentoriaMetricsGridProps {
  mentoriaId: string;
  metrics: MentoriaWithMetrics | null;
}

function zeroMetrics(): MentoriaWithMetrics {
  return {
    id: "",
    name: "",
    scheduled_at: "",
    status: "em_andamento",
    specialist: null,
    funnels_count: 0,
    leads_grupo: 0,
    leads_ao_vivo: 0,
    agendamentos: 0,
    calls_realizadas: 0,
    vendas: 0,
    valor_vendas: 0,
    valor_entrada: 0,
    investimento_trafego: 0,
    investimento_api: 0,
    last_metric_at: null,
    pct_comparecimento: 0,
    pct_agendamento: 0,
    pct_comparecimento_call: 0,
    pct_conversao_call: 0,
    sem_debriefing: true,
  };
}

export function MentoriaMetricsGrid({
  mentoriaId,
  metrics,
}: MentoriaMetricsGridProps) {
  const data = metrics ?? zeroMetrics();
  const investmentTotal = data.investimento_trafego + data.investimento_api;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold">Métricas</h2>
          <p className="text-xs text-muted-foreground">
            {data.last_metric_at
              ? `Última atualização em ${formatDateTimeBR(data.last_metric_at)}`
              : "Nenhuma snapshot registrada"}
          </p>
        </div>
        <MentoriaMetricsDrawer mentoriaId={mentoriaId} current={metrics} />
      </div>

      <Card className="flex flex-col gap-4">
        <CardHeader className="pb-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Investimento Total
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <span className="font-heading text-3xl font-semibold tabular-nums">
            {formatCurrency(investmentTotal)}
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Tráfego
              </p>
              <p className="font-heading text-sm font-semibold tabular-nums">
                {formatCurrency(data.investimento_trafego)}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                API (WhatsApp)
              </p>
              <p className="font-heading text-sm font-semibold tabular-nums">
                {formatCurrency(data.investimento_api)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Leads no Grupo" value={data.leads_grupo} format="integer" />
        <MetricCard label="Leads Ao Vivo" value={data.leads_ao_vivo} format="integer" />
        <MetricCard label="Agendamentos" value={data.agendamentos} format="integer" />
        <MetricCard label="Calls Realizadas" value={data.calls_realizadas} format="integer" />
        <MetricCard label="Vendas" value={data.vendas} format="integer" />
        <MetricCard label="Valor Vendas" value={data.valor_vendas} format="currency" />
        <MetricCard label="Valor Entrada" value={data.valor_entrada} format="currency" />
      </div>
    </section>
  );
}
