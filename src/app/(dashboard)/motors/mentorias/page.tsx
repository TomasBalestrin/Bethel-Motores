import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { MentoriaCard } from "@/components/mentorias/MentoriaCard";
import { MentoriaFormModal } from "@/components/mentorias/MentoriaFormModal";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  resolvePeriodFromSearchParams,
  type PeriodSearchParams,
} from "@/lib/utils/period";
import { createClient } from "@/lib/supabase/server";
import {
  getMotorStats,
  listMentorias,
  type MotorStatsPayload,
} from "@/services/mentorias.service";
import { formatDateBR } from "@/lib/utils/format";
import type { MentoriaWithMetrics } from "@/types/mentoria";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Motor de Mentorias" };

interface PageProps {
  searchParams: PeriodSearchParams;
}

function zeroStats(from: string, to: string): MotorStatsPayload {
  const empty = {
    activeMentorias: 0,
    investment: 0,
    revenue: 0,
    base: 0,
    trafficCapture: 0,
  };
  return {
    range: { from, to },
    previousRange: { from, to },
    current: empty,
    previous: empty,
    deltas: {
      investment: { value: 0, direction: "flat" },
      revenue: { value: 0, direction: "flat" },
      base: { value: 0, direction: "flat" },
      trafficCapture: { value: 0, direction: "flat" },
    },
  };
}

export default async function MentoriasDashboardPage({ searchParams }: PageProps) {
  const period = resolvePeriodFromSearchParams(searchParams);

  let stats: MotorStatsPayload;
  let activeMentorias: MentoriaWithMetrics[] = [];
  try {
    const supabase = await createClient();
    const [statsResult, list] = await Promise.all([
      getMotorStats(supabase, period.range),
      listMentorias(supabase, { status: "em_andamento", sort: "recent" }),
    ]);
    stats = statsResult;
    activeMentorias = list;
  } catch (error) {
    console.error(
      "[/motors/mentorias] failed:",
      error instanceof Error ? error.message : error
    );
    stats = zeroStats(period.range.from, period.range.to);
  }

  const { current, deltas } = stats;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Motor de Mentorias
          </h1>
          <p className="text-sm text-muted-foreground">
            Período: {formatDateBR(period.range.from)} →{" "}
            {formatDateBR(period.range.to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter />
          <MentoriaFormModal />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Mentorias Ativas"
          value={current.activeMentorias}
          format="integer"
        />
        <MetricCard
          label="Investimento Total"
          value={current.investment}
          format="currency"
          delta={deltas.investment.value}
        />
        <MetricCard
          label="Faturamento Total"
          value={current.revenue}
          format="currency"
          delta={deltas.revenue.value}
        />
        <MetricCard
          label="Base Total"
          value={current.base}
          format="integer"
          delta={deltas.base.value}
        />
        <MetricCard
          label="Captação Tráfego Total"
          value={current.trafficCapture}
          format="integer"
          delta={deltas.trafficCapture.value}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Mentorias em andamento
            </h2>
            <p className="text-xs text-muted-foreground">
              {activeMentorias.length === 1
                ? "1 mentoria ativa"
                : `${activeMentorias.length} mentorias ativas`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/motors/mentorias/listagem">Ver todas</Link>
          </Button>
        </div>

        {activeMentorias.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nenhuma mentoria em andamento"
            description="Cadastre uma nova mentoria para começar a acompanhar os números."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeMentorias.map((mentoria) => (
              <MentoriaCard key={mentoria.id} mentoria={mentoria} />
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/motors/mentorias/comparar">Comparar mentorias</Link>
        </Button>
      </div>
    </div>
  );
}
