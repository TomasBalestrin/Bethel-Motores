import { createClient } from "@/lib/supabase/server";
import {
  getTrafegoKPIs,
  listTrafegoByMentoria,
  type TrafegoEntry,
  type TrafegoKPIs,
} from "@/services/mentorias.service";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrafegoBudgetBreakdown } from "@/components/mentorias/TrafegoBudgetBreakdown";
import { TrafegoChart } from "@/components/mentorias/TrafegoChart";
import { TrafegoBatchForm } from "@/components/mentorias/TrafegoBatchForm";
import { TrafegoTable } from "@/components/mentorias/TrafegoTable";

interface PageProps {
  params: { mentoriaId: string };
}

function zeroKPIs(): TrafegoKPIs {
  return {
    total_investido: 0,
    total_budget: 0,
    total_leads: 0,
    vendas: 0,
    cpl: null,
    cac: null,
    burn_rate_pct: null,
    traffic_funnels_count: 0,
    platforms: [],
  };
}

export default async function TrafegoPage({ params }: PageProps) {
  const supabase = await createClient();
  const [entries, kpis] = await Promise.all([
    listTrafegoByMentoria(supabase, params.mentoriaId).catch(
      () => [] as TrafegoEntry[]
    ),
    getTrafegoKPIs(supabase, params.mentoriaId).catch(() => zeroKPIs()),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Investido"
          value={kpis.total_investido}
          format="currency"
        />
        <TrafegoBudgetBreakdown
          mentoriaId={params.mentoriaId}
          platforms={kpis.platforms}
          totalInvestido={kpis.total_investido}
          totalBudget={kpis.total_budget}
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

      <Card className="space-y-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-heading text-base font-semibold">
            Lançamento em lote
          </h2>
          <span className="text-xs text-muted-foreground">
            Adicione quantas linhas precisar e salve tudo de uma vez
          </span>
        </div>
        <TrafegoBatchForm mentoriaId={params.mentoriaId} />
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
