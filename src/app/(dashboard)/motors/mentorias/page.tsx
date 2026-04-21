import Link from "next/link";
import { LineChart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/MetricCard";
import {
  PeriodFilter,
  resolvePeriodFromSearchParams,
  type PeriodSearchParams,
} from "@/components/dashboard/PeriodFilter";

export const dynamic = "force-dynamic";

interface MentoriasStats {
  activeMentorias: number;
  totalInvestment: number;
  totalRevenue: number;
  totalBase: number;
  totalTrafficCapture: number;
}

function zeroStats(): MentoriasStats {
  return {
    activeMentorias: 0,
    totalInvestment: 0,
    totalRevenue: 0,
    totalBase: 0,
    totalTrafficCapture: 0,
  };
}

interface PageProps {
  searchParams: PeriodSearchParams;
}

export default async function MentoriasDashboardPage({ searchParams }: PageProps) {
  const period = resolvePeriodFromSearchParams(searchParams);
  const stats = zeroStats();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Motor de Mentorias
          </h1>
          <p className="text-sm text-muted-foreground">
            Período: {period.range.from} → {period.range.to}
          </p>
        </div>
        <PeriodFilter />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Mentorias Ativas"
          value={stats.activeMentorias}
          format="integer"
        />
        <MetricCard
          label="Investimento Total"
          value={stats.totalInvestment}
          format="currency"
        />
        <MetricCard
          label="Faturamento Total"
          value={stats.totalRevenue}
          format="currency"
        />
        <MetricCard label="Base Total" value={stats.totalBase} format="integer" />
        <MetricCard
          label="Captação Tráfego Total"
          value={stats.totalTrafficCapture}
          format="integer"
        />
      </div>

      <section className="flex h-72 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card text-center text-sm text-muted-foreground">
        <LineChart className="h-6 w-6" aria-hidden />
        <p>Gráfico de evolução diária (investimento × faturamento)</p>
        <p className="text-xs">Será conectado ao Recharts em task futura.</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/motors/mentorias/listagem">Ver todas as mentorias</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/motors/mentorias/comparar">Comparar mentorias</Link>
        </Button>
      </div>
    </div>
  );
}
