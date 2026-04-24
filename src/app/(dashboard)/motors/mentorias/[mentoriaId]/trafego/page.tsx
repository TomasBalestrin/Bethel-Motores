import { createClient } from "@/lib/supabase/server";
import {
  getTrafegoKPIs,
  listTrafegoByMentoria,
  type TrafegoEntry,
  type TrafegoKPIs,
} from "@/services/mentorias.service";
import { listFunnelsByMentoria } from "@/services/funnels.service";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrafegoBudgetCard } from "@/components/mentorias/TrafegoBudgetCard";
import { TrafegoChart } from "@/components/mentorias/TrafegoChart";
import { TrafegoInlineForm } from "@/components/mentorias/TrafegoInlineForm";
import { TrafegoTable } from "@/components/mentorias/TrafegoTable";

interface PageProps {
  params: { mentoriaId: string };
}

function zeroKPIs(): TrafegoKPIs {
  return {
    total_investido: 0,
    traffic_budget: null,
    total_leads: 0,
    vendas: 0,
    cpl: null,
    cac: null,
    burn_rate_pct: null,
    traffic_funnels_count: 0,
  };
}

export default async function TrafegoPage({ params }: PageProps) {
  const supabase = await createClient();
  const [entries, funnels, kpis] = await Promise.all([
    listTrafegoByMentoria(supabase, params.mentoriaId).catch(
      () => [] as TrafegoEntry[]
    ),
    listFunnelsByMentoria(supabase, params.mentoriaId).catch(() => []),
    getTrafegoKPIs(supabase, params.mentoriaId).catch(() => zeroKPIs()),
  ]);

  const funnelOptions = funnels.map((funnel) => ({
    id: funnel.id,
    name: funnel.name,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Investido"
          value={kpis.total_investido}
          format="currency"
        />
        <TrafegoBudgetCard
          investido={kpis.total_investido}
          budget={kpis.traffic_budget}
        />
        <MetricCard
          label="CPL (custo por lead)"
          value={kpis.cpl ?? 0}
          format="currency"
        />
        <MetricCard
          label="CAC (custo por venda)"
          value={kpis.cac ?? 0}
          format="currency"
        />
      </div>

      <Card className="p-5">
        <TrafegoInlineForm
          mentoriaId={params.mentoriaId}
          funnels={funnelOptions}
        />
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-base font-semibold">
            Investimento diário por plataforma
          </h2>
          <span className="text-xs text-muted-foreground">
            {entries.length === 1
              ? "1 registro"
              : `${entries.length} registros`}
            {kpis.traffic_funnels_count > 0
              ? ` · ${kpis.total_leads} leads de ${kpis.traffic_funnels_count} funil${
                  kpis.traffic_funnels_count === 1 ? "" : "s"
                } de tráfego`
              : " · nenhum funil marcado como tráfego"}
            {kpis.vendas > 0 ? ` · ${kpis.vendas} vendas` : ""}
          </span>
        </div>
        <TrafegoChart entries={entries} />
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-heading text-base font-semibold">Registros</h2>
        <TrafegoTable entries={entries} />
      </Card>
    </div>
  );
}
