import type { SupabaseClient } from "@supabase/supabase-js";
import { calcDelta, type DeltaResult } from "@/lib/utils/calc";
import {
  rangeToRangeWithPrevious,
  toRangeEndISO,
  toRangeStartISO,
} from "@/lib/utils/date-range";
import type { DateRange } from "@/types/common";

interface MetricRow {
  mentoria_id: string;
  leads_grupo: number | null;
  investimento_trafego: number | null;
  investimento_api: number | null;
  valor_vendas: number | null;
  captured_at: string;
}

interface AggregateTotals {
  investment: number;
  revenue: number;
  base: number;
  trafficCapture: number;
}

interface MotorStatsTotals extends AggregateTotals {
  activeMentorias: number;
}

export interface MotorStatsPayload {
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  current: MotorStatsTotals;
  previous: MotorStatsTotals;
  deltas: {
    investment: DeltaResult;
    revenue: DeltaResult;
    base: DeltaResult;
    trafficCapture: DeltaResult;
  };
}

const METRIC_COLUMNS =
  "mentoria_id, leads_grupo, investimento_trafego, investimento_api, valor_vendas, captured_at" as const;

function sumLatestPerMentoria(rows: MetricRow[]): AggregateTotals {
  const latestByMentoria = new Map<string, MetricRow>();
  for (const row of rows) {
    const existing = latestByMentoria.get(row.mentoria_id);
    if (!existing || new Date(row.captured_at) > new Date(existing.captured_at)) {
      latestByMentoria.set(row.mentoria_id, row);
    }
  }

  let investment = 0;
  let revenue = 0;
  let base = 0;

  for (const row of Array.from(latestByMentoria.values())) {
    const trafego = Number(row.investimento_trafego ?? 0);
    const api = Number(row.investimento_api ?? 0);
    investment += trafego + api;
    revenue += Number(row.valor_vendas ?? 0);
    base += Number(row.leads_grupo ?? 0);
  }

  return { investment, revenue, base, trafficCapture: 0 };
}

async function fetchMetricsInRange(
  supabase: SupabaseClient,
  from: string,
  to: string
): Promise<MetricRow[]> {
  const { data, error } = await supabase
    .from("mentoria_metrics")
    .select(METRIC_COLUMNS)
    .gte("captured_at", toRangeStartISO(from))
    .lte("captured_at", toRangeEndISO(to))
    .returns<MetricRow[]>();

  if (error) throw error;
  return data ?? [];
}

async function fetchTrafficCapture(
  supabase: SupabaseClient,
  from: string,
  to: string
): Promise<number> {
  const { data, error } = await supabase
    .from("funnel_metric_snapshots")
    .select("numeric_value, origin, captured_at")
    .eq("origin", "traffic")
    .gte("captured_at", toRangeStartISO(from))
    .lte("captured_at", toRangeEndISO(to))
    .returns<{ numeric_value: number | null; origin: string; captured_at: string }[]>();

  if (error) return 0;
  if (!data) return 0;
  return data.reduce((sum, row) => sum + Number(row.numeric_value ?? 0), 0);
}

async function countActiveMentorias(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("mentorias")
    .select("id", { count: "exact", head: true })
    .eq("status", "em_andamento")
    .is("deleted_at", null);

  if (error) return 0;
  return count ?? 0;
}

async function aggregateForRange(
  supabase: SupabaseClient,
  from: string,
  to: string
): Promise<AggregateTotals> {
  const [metrics, trafficCapture] = await Promise.all([
    fetchMetricsInRange(supabase, from, to).catch(() => []),
    fetchTrafficCapture(supabase, from, to),
  ]);
  const totals = sumLatestPerMentoria(metrics);
  return { ...totals, trafficCapture };
}

export async function getMotorStats(
  supabase: SupabaseClient,
  range: DateRange
): Promise<MotorStatsPayload> {
  const { previousFrom, previousTo } = rangeToRangeWithPrevious(range);

  const [activeMentorias, currentAggregate, previousAggregate] =
    await Promise.all([
      countActiveMentorias(supabase),
      aggregateForRange(supabase, range.from, range.to),
      aggregateForRange(supabase, previousFrom, previousTo),
    ]);

  return {
    range,
    previousRange: { from: previousFrom, to: previousTo },
    current: { activeMentorias, ...currentAggregate },
    previous: { activeMentorias: 0, ...previousAggregate },
    deltas: {
      investment: calcDelta(currentAggregate.investment, previousAggregate.investment),
      revenue: calcDelta(currentAggregate.revenue, previousAggregate.revenue),
      base: calcDelta(currentAggregate.base, previousAggregate.base),
      trafficCapture: calcDelta(
        currentAggregate.trafficCapture,
        previousAggregate.trafficCapture
      ),
    },
  };
}
