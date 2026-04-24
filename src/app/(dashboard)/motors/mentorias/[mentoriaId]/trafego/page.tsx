import { createClient } from "@/lib/supabase/server";
import {
  getTrafegoKPIs,
  listTrafegoByMentoria,
  type TrafegoEntry,
  type TrafegoKPIs,
} from "@/services/mentorias.service";
import {
  listCreativesWithSpend,
  type CreativeWithSpend,
} from "@/services/creatives.service";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrafegoBudgetCard } from "@/components/mentorias/TrafegoBudgetCard";
import { TrafegoChart } from "@/components/mentorias/TrafegoChart";
import { TrafegoBatchForm } from "@/components/mentorias/TrafegoBatchForm";
import { TrafegoTable } from "@/components/mentorias/TrafegoTable";
import { CreativesSection } from "@/components/mentorias/CreativesSection";

interface PageProps {
  params: { mentoriaId: string };
}

function zeroKPIs(): TrafegoKPIs {
  return {
    total_investido: 0,
    traffic_budget: null,
    total_leads: 0,
    qualified_leads: 0,
    vendas: 0,
    cpl: null,
    cpql: null,
    cac: null,
    burn_rate_pct: null,
    traffic_funnels_count: 0,
    creatives_count: 0,
    creatives_video: 0,
    creatives_static: 0,
  };
}

export default async function TrafegoPage({ params }: PageProps) {
  const supabase = await createClient();
  const [entries, kpis, creatives] = await Promise.all([
    listTrafegoByMentoria(supabase, params.mentoriaId).catch(
      () => [] as TrafegoEntry[]
    ),
    getTrafegoKPIs(supabase, params.mentoriaId).catch(() => zeroKPIs()),
    listCreativesWithSpend(supabase, params.mentoriaId).catch(
      () => [] as CreativeWithSpend[]
    ),
  ]);

  const activeCreatives = creatives.filter((c) => c.is_active);
  const creativeOptions = activeCreatives.map((c) => ({
    id: c.id,
    code: c.code,
    format: c.format,
  }));
  const creativeById = Object.fromEntries(
    creatives.map((c) => [c.id, { code: c.code, format: c.format }])
  );

  return (
    <div className="space-y-6">
      {/* Linha 1: 4 KPIs principais */}
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
          label="Leads"
          value={kpis.total_leads}
          format="integer"
        />
        <MetricCard
          label="Qualificados"
          value={kpis.qualified_leads}
          format="integer"
        />
      </div>

      {/* Linha 2: 4 KPIs derivados */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="CPL (custo por lead)"
          value={kpis.cpl ?? 0}
          format="currency"
        />
        <MetricCard
          label="CPQL (custo por qualif.)"
          value={kpis.cpql ?? 0}
          format="currency"
        />
        <MetricCard
          label="Criativos ativos"
          value={kpis.creatives_count}
          format="integer"
        />
        <MetricCard
          label="Vídeo / Estático"
          value={kpis.creatives_video}
          format="integer"
        />
      </div>

      <Card className="space-y-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-heading text-base font-semibold">
            Lançamento em lote
          </h2>
          <span className="text-xs text-muted-foreground">
            Data, valor e criativo (opcional). Adicione várias linhas e salve
            tudo de uma vez.
          </span>
        </div>
        <TrafegoBatchForm
          mentoriaId={params.mentoriaId}
          creatives={creativeOptions}
        />
      </Card>

      <Card className="space-y-3 p-5">
        <CreativesSection
          mentoriaId={params.mentoriaId}
          creatives={creatives}
        />
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-base font-semibold">
            Investimento diário
          </h2>
          <span className="text-xs text-muted-foreground">
            {entries.length === 1
              ? "1 registro"
              : `${entries.length} registros`}
            {kpis.traffic_funnels_count > 0
              ? ` · ${kpis.total_leads} leads · ${kpis.qualified_leads} qualif.`
              : " · nenhum funil de tráfego"}
            {kpis.vendas > 0 ? ` · ${kpis.vendas} vendas` : ""}
          </span>
        </div>
        <TrafegoChart entries={entries} />
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-heading text-base font-semibold">Registros</h2>
        <TrafegoTable entries={entries} creativeById={creativeById} />
      </Card>
    </div>
  );
}
