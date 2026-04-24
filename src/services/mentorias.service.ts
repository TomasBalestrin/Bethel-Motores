import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { calcDelta, calcPercent, type DeltaResult } from "@/lib/utils/calc";
import {
  rangeToRangeWithPrevious,
  toRangeEndISO,
  toRangeStartISO,
} from "@/lib/utils/date-range";
import type { DateRange } from "@/types/common";
import type {
  MentoriaCreateInput,
  MentoriaStatus,
  MentoriaSort,
} from "@/lib/validators/mentoria";
import type { MentoriaFilters, MentoriaWithMetrics } from "@/types/mentoria";
import { logAudit } from "@/services/audit.service";

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
    .select("value_numeric, captured_at, funnels!inner(is_traffic_funnel)")
    .eq("funnels.is_traffic_funnel", true)
    .gte("captured_at", toRangeStartISO(from))
    .lte("captured_at", toRangeEndISO(to))
    .returns<{ value_numeric: number | null; captured_at: string }[]>();

  if (error) return 0;
  if (!data) return 0;
  return data.reduce((sum, row) => sum + Number(row.value_numeric ?? 0), 0);
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

interface MentoriaRow {
  id: string;
  name: string;
  scheduled_at: string;
  status: MentoriaStatus;
  specialist: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  funnels_rel:
    | {
        id: string;
        deleted_at: string | null;
      }[]
    | null;
  latest_metrics:
    | {
        total_leads: number | null;
        leads_grupo: number | null;
        leads_ao_vivo: number | null;
        agendamentos: number | null;
        calls_realizadas: number | null;
        vendas: number | null;
        valor_vendas: number | null;
        valor_entrada: number | null;
        investimento_trafego: number | null;
        investimento_api: number | null;
        captured_at: string;
      }[]
    | null;
}

const MENTORIA_SELECT = `
  id,
  name,
  scheduled_at,
  status,
  specialist:social_profiles!mentorias_specialist_id_fkey(id, name, slug),
  funnels_rel:funnels(id, deleted_at),
  latest_metrics:mentoria_metrics(
    total_leads,
    leads_grupo,
    leads_ao_vivo,
    agendamentos,
    calls_realizadas,
    vendas,
    valor_vendas,
    valor_entrada,
    investimento_trafego,
    investimento_api,
    captured_at
  )
`;

interface LiveLeadStats {
  total_leads: number;
  leads_grupo: number;
  leads_ao_vivo: number;
  agendamentos: number;
  vendas: number;
  valor_vendas: number;
  valor_entrada: number;
}

function toMentoriaDTO(
  row: MentoriaRow,
  live?: LiveLeadStats | null
): MentoriaWithMetrics {
  const snapshots = row.latest_metrics ?? [];
  const latest = snapshots.length
    ? [...snapshots].sort(
        (a, b) =>
          new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
      )[0] ?? null
    : null;

  // Métricas derivadas de leads: usa dados ao vivo quando disponível.
  // Métricas manuais (calls, investimentos): sempre do snapshot.
  const totalLeads = live ? Number(live.total_leads) : Number(latest?.total_leads ?? 0);
  const leadsGrupo = live ? Number(live.leads_grupo) : Number(latest?.leads_grupo ?? 0);
  const leadsAoVivo = live ? Number(live.leads_ao_vivo) : Number(latest?.leads_ao_vivo ?? 0);
  const agendamentos = live ? Number(live.agendamentos) : Number(latest?.agendamentos ?? 0);
  const vendas = live ? Number(live.vendas) : Number(latest?.vendas ?? 0);
  const valorVendas = live ? Number(live.valor_vendas) : Number(latest?.valor_vendas ?? 0);
  const valorEntrada = live ? Number(live.valor_entrada) : Number(latest?.valor_entrada ?? 0);
  const callsRealizadas = Number(latest?.calls_realizadas ?? 0);

  const funnelsCount = (row.funnels_rel ?? []).filter(
    (f) => f.deleted_at === null
  ).length;

  return {
    id: row.id,
    name: row.name,
    scheduled_at: row.scheduled_at,
    status: row.status,
    specialist: row.specialist ?? null,
    funnels_count: funnelsCount,
    total_leads: totalLeads,
    leads_grupo: leadsGrupo,
    leads_ao_vivo: leadsAoVivo,
    agendamentos,
    calls_realizadas: callsRealizadas,
    vendas,
    valor_vendas: valorVendas,
    valor_entrada: valorEntrada,
    investimento_trafego: Number(latest?.investimento_trafego ?? 0),
    investimento_api: Number(latest?.investimento_api ?? 0),
    last_metric_at: latest?.captured_at ?? null,
    pct_comparecimento: calcPercent(leadsAoVivo, leadsGrupo),
    pct_agendamento: calcPercent(agendamentos, leadsAoVivo),
    pct_comparecimento_call: calcPercent(callsRealizadas, agendamentos),
    pct_conversao_call: calcPercent(vendas, callsRealizadas),
    sem_debriefing: !latest,
  };
}

function applySort(rows: MentoriaWithMetrics[], sort: MentoriaSort | undefined) {
  const copy = [...rows];
  if (sort === "oldest") {
    copy.sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() -
        new Date(b.scheduled_at).getTime()
    );
  } else if (sort === "top_revenue") {
    copy.sort((a, b) => b.valor_vendas - a.valor_vendas);
  } else {
    copy.sort(
      (a, b) =>
        new Date(b.scheduled_at).getTime() -
        new Date(a.scheduled_at).getTime()
    );
  }
  return copy;
}

export async function listMentorias(
  supabase: SupabaseClient,
  filters: MentoriaFilters = {}
): Promise<MentoriaWithMetrics[]> {
  let query = supabase
    .from("mentorias")
    .select(MENTORIA_SELECT)
    .is("deleted_at", null);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.query && filters.query.trim().length > 0) {
    query = query.ilike("name", `%${filters.query.trim()}%`);
  }

  const { data, error } = await query.returns<MentoriaRow[]>();
  if (error) throw error;

  const mentorias = (data ?? []).map((row) => toMentoriaDTO(row));
  return applySort(mentorias, filters.sort);
}

export interface CreateMentoriaOptions {
  actorId?: string;
}

export async function createMentoria(
  supabase: SupabaseClient,
  input: MentoriaCreateInput,
  options: CreateMentoriaOptions = {}
): Promise<{ id: string }> {
  const row = {
    name: input.name,
    scheduled_at: input.scheduled_at,
    specialist_id: input.specialist_id,
    traffic_budget: input.traffic_budget ?? null,
    created_by: options.actorId ?? null,
  };

  const { data, error } = await supabase
    .from("mentorias")
    .insert(row)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "create",
    entityType: "mentoria",
    entityId: data.id,
    changes: { after: row },
  });

  return data;
}

const MENTORIA_DETAIL_SELECT = `
  id,
  name,
  scheduled_at,
  specialist_id,
  traffic_budget,
  status,
  created_by,
  created_at,
  updated_at,
  specialist:social_profiles!mentorias_specialist_id_fkey(id, name, slug),
  funnels(id, name, template_id, created_at)
`;

interface MentoriaDetailRow {
  id: string;
  name: string;
  scheduled_at: string;
  specialist_id: string;
  traffic_budget: number | null;
  status: MentoriaStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  specialist: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  funnels:
    | {
        id: string;
        name: string;
        template_id: string | null;
        created_at: string;
      }[]
    | null;
}

export const getMentoriaById = cache(async (
  supabase: SupabaseClient,
  id: string
) => {
  const { data, error } = await supabase
    .from("mentorias")
    .select(MENTORIA_DETAIL_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<MentoriaDetailRow>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    scheduled_at: data.scheduled_at,
    specialist_id: data.specialist_id,
    traffic_budget: data.traffic_budget,
    status: data.status,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
    specialist: data.specialist ?? null,
    funnels: data.funnels ?? [],
  };
});

export async function updateMentoria(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{
    name: string;
    scheduled_at: string;
    specialist_id: string;
    traffic_budget: number | null;
    status: MentoriaStatus;
  }>,
  options: { actorId?: string | null } = {}
): Promise<{ id: string }> {
  const { data: before } = await supabase
    .from("mentorias")
    .select("name, scheduled_at, specialist_id, traffic_budget, status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  const { data, error } = await supabase
    .from("mentorias")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "mentoria",
    entityId: id,
    changes: {
      before: before ? (before as Record<string, unknown>) : null,
      after: patch as Record<string, unknown>,
    },
  });

  return data;
}

export type TrafegoPlatform =
  | "meta_ads"
  | "google_ads"
  | "tiktok"
  | "youtube"
  | "outro";

export interface TrafegoEntry {
  id: string;
  captured_at: string;
  investimento_trafego: number;
  investimento_api: number;
  source: "manual" | "webhook" | "api";
  platform: TrafegoPlatform | null;
  captured_by: string | null;
  responsavel_nome: string | null;
  notes: string | null;
}

interface TrafegoRow {
  id: string;
  captured_at: string;
  investimento_trafego: number | null;
  investimento_api: number | null;
  source: "manual" | "webhook" | "api";
  platform: TrafegoPlatform | null;
  captured_by: string | null;
  captured_by_profile: { name: string | null } | null;
}

export async function listTrafegoByMentoria(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<TrafegoEntry[]> {
  const { data, error } = await supabase
    .from("mentoria_metrics")
    .select(
      `
        id,
        captured_at,
        investimento_trafego,
        investimento_api,
        source,
        platform,
        captured_by,
        captured_by_profile:user_profiles!mentoria_metrics_captured_by_fkey(name)
      `
    )
    .eq("mentoria_id", mentoriaId)
    .gt("investimento_trafego", 0)
    .order("captured_at", { ascending: false })
    .returns<TrafegoRow[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    captured_at: row.captured_at,
    investimento_trafego: Number(row.investimento_trafego ?? 0),
    investimento_api: Number(row.investimento_api ?? 0),
    source: row.source,
    platform: row.platform,
    captured_by: row.captured_by,
    responsavel_nome: row.captured_by_profile?.name ?? null,
    notes: null,
  }));
}

export interface InsertTrafegoInput {
  value: number;
  platform: TrafegoPlatform;
  capturedAt?: string;
  actorId?: string | null;
}

export async function insertTrafegoEntry(
  supabase: SupabaseClient,
  mentoriaId: string,
  input: InsertTrafegoInput
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("mentoria_metrics")
    .insert({
      mentoria_id: mentoriaId,
      investimento_trafego: input.value,
      investimento_api: 0,
      leads_grupo: 0,
      leads_ao_vivo: 0,
      agendamentos: 0,
      calls_realizadas: 0,
      vendas: 0,
      valor_vendas: 0,
      valor_entrada: 0,
      source: "manual",
      platform: input.platform,
      captured_at: input.capturedAt ?? new Date().toISOString(),
      captured_by: input.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}

export interface BatchTrafegoEntry {
  value: number;
  platform: TrafegoPlatform;
  capturedAt: string;
}

export async function insertTrafegoBatch(
  supabase: SupabaseClient,
  mentoriaId: string,
  entries: BatchTrafegoEntry[],
  options: { actorId?: string | null } = {}
): Promise<number> {
  if (entries.length === 0) return 0;
  const rows = entries.map((e) => ({
    mentoria_id: mentoriaId,
    investimento_trafego: e.value,
    investimento_api: 0,
    leads_grupo: 0,
    leads_ao_vivo: 0,
    agendamentos: 0,
    calls_realizadas: 0,
    vendas: 0,
    valor_vendas: 0,
    valor_entrada: 0,
    source: "manual" as const,
    platform: e.platform,
    captured_at: e.capturedAt,
    captured_by: options.actorId ?? null,
  }));
  const { error } = await supabase.from("mentoria_metrics").insert(rows);
  if (error) throw error;
  return rows.length;
}

export interface TrafegoBudget {
  platform: TrafegoPlatform;
  amount: number;
}

export async function listTrafficBudgets(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<TrafegoBudget[]> {
  const { data, error } = await supabase
    .from("mentoria_traffic_budgets")
    .select("platform, amount")
    .eq("mentoria_id", mentoriaId)
    .returns<{ platform: TrafegoPlatform; amount: number | null }[]>();
  if (error) throw error;
  return (data ?? []).map((r) => ({
    platform: r.platform,
    amount: Number(r.amount ?? 0),
  }));
}

export async function upsertTrafficBudgets(
  supabase: SupabaseClient,
  mentoriaId: string,
  budgets: TrafegoBudget[]
): Promise<void> {
  if (budgets.length === 0) return;
  const now = new Date().toISOString();
  const rows = budgets.map((b) => ({
    mentoria_id: mentoriaId,
    platform: b.platform,
    amount: b.amount,
    updated_at: now,
  }));
  const { error } = await supabase
    .from("mentoria_traffic_budgets")
    .upsert(rows, { onConflict: "mentoria_id,platform" });
  if (error) throw error;
}

export interface PlatformBreakdown {
  platform: TrafegoPlatform;
  spent: number;
  budget: number;
}

export interface TrafegoKPIs {
  total_investido: number;
  total_budget: number;
  total_leads: number;
  vendas: number;
  cpl: number | null;
  cac: number | null;
  burn_rate_pct: number | null;
  traffic_funnels_count: number;
  platforms: PlatformBreakdown[];
}

const ALL_PLATFORMS: TrafegoPlatform[] = [
  "meta_ads",
  "google_ads",
  "tiktok",
  "youtube",
  "outro",
];

export async function getTrafegoKPIs(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<TrafegoKPIs> {
  const [entries, budgets, trafficFunnelsResult] = await Promise.all([
    listTrafegoByMentoria(supabase, mentoriaId).catch(
      () => [] as TrafegoEntry[]
    ),
    listTrafficBudgets(supabase, mentoriaId).catch(() => [] as TrafegoBudget[]),
    supabase
      .from("funnels")
      .select("id")
      .eq("mentoria_id", mentoriaId)
      .eq("is_traffic_funnel", true)
      .is("deleted_at", null)
      .returns<{ id: string }[]>(),
  ]);

  // Agrega investimento por plataforma
  const spentByPlatform = new Map<TrafegoPlatform, number>();
  for (const entry of entries) {
    const p: TrafegoPlatform = entry.platform ?? "outro";
    spentByPlatform.set(
      p,
      (spentByPlatform.get(p) ?? 0) + (entry.investimento_trafego ?? 0)
    );
  }

  const budgetByPlatform = new Map<TrafegoPlatform, number>();
  for (const b of budgets) {
    budgetByPlatform.set(b.platform, b.amount);
  }

  const platforms: PlatformBreakdown[] = ALL_PLATFORMS.map((p) => ({
    platform: p,
    spent: spentByPlatform.get(p) ?? 0,
    budget: budgetByPlatform.get(p) ?? 0,
  }));

  const totalInvestido = platforms.reduce((s, p) => s + p.spent, 0);
  const totalBudget = platforms.reduce((s, p) => s + p.budget, 0);

  const trafficFunnelIds =
    trafficFunnelsResult.data?.map((f) => f.id) ?? [];
  let totalLeads = 0;
  let vendas = 0;

  if (trafficFunnelIds.length > 0) {
    const { data: aggRows } = await supabase.rpc(
      "get_funnel_lead_aggregates",
      { funnel_ids: trafficFunnelIds }
    );
    if (Array.isArray(aggRows)) {
      for (const row of aggRows as Array<{
        leads_do_funil: number | null;
        vendas: number | null;
      }>) {
        totalLeads += Number(row.leads_do_funil ?? 0);
        vendas += Number(row.vendas ?? 0);
      }
    }
  }

  const cpl = totalLeads > 0 ? totalInvestido / totalLeads : null;
  const cac = vendas > 0 ? totalInvestido / vendas : null;
  const burnRatePct =
    totalBudget > 0 ? (totalInvestido / totalBudget) * 100 : null;

  return {
    total_investido: totalInvestido,
    total_budget: totalBudget,
    total_leads: totalLeads,
    vendas,
    cpl,
    cac,
    burn_rate_pct: burnRatePct,
    traffic_funnels_count: trafficFunnelIds.length,
    platforms,
  };
}

export interface DisparoEvent {
  id: string;
  source_id: string;
  source_slug: string | null;
  mentoria_id: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "processed" | "error" | "skipped";
  error_message: string | null;
  source_event_id: string | null;
  received_at: string;
  processed_at: string | null;
  volume_sent: number;
  volume_delivered: number;
  volume_read: number;
  volume_replied: number;
  volume_failed: number;
  cost: number;
  funnel_label: string | null;
  campaign_name: string | null;
  template_name: string | null;
  responsible_name: string | null;
}

interface DisparoRow {
  id: string;
  source_id: string;
  mentoria_id: string | null;
  payload: Record<string, unknown> | null;
  status: "pending" | "processed" | "error" | "skipped";
  error_message: string | null;
  source_event_id: string | null;
  received_at: string;
  processed_at: string | null;
  source: { slug: string | null } | null;
}

function pickPath(
  payload: Record<string, unknown> | null,
  path: string
): unknown {
  if (!payload) return undefined;
  const parts = path.split(".");
  let current: unknown = payload;
  for (const part of parts) {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function pickNumber(payload: Record<string, unknown> | null, keys: string[]): number {
  if (!payload) return 0;
  for (const key of keys) {
    const value = pickPath(payload, key);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function pickString(
  payload: Record<string, unknown> | null,
  keys: string[]
): string | null {
  if (!payload) return null;
  for (const key of keys) {
    const value = pickPath(payload, key);
    if (typeof value === "string" && value.trim().length > 0) return value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const named = (value as Record<string, unknown>)["name"];
      if (typeof named === "string" && named.trim().length > 0) return named;
    }
  }
  return null;
}

function toDisparoDTO(row: DisparoRow): DisparoEvent {
  const payload = row.payload ?? {};
  return {
    id: row.id,
    source_id: row.source_id,
    source_slug: row.source?.slug ?? null,
    mentoria_id: row.mentoria_id,
    payload,
    status: row.status,
    error_message: row.error_message,
    source_event_id: row.source_event_id,
    received_at: row.received_at,
    processed_at: row.processed_at,
    volume_sent: pickNumber(payload as Record<string, unknown>, [
      "volume",
      "volume_sent",
      "sent",
      "stats.sent",
      "metrics.sent",
      "stats.enviados",
    ]),
    volume_delivered: pickNumber(payload as Record<string, unknown>, [
      "volume_delivered",
      "delivered",
      "stats.delivered",
      "metrics.delivered",
      "stats.entregues",
    ]),
    volume_read: pickNumber(payload as Record<string, unknown>, [
      "read",
      "volume_read",
      "reads",
      "stats.read",
      "metrics.read",
      "stats.lidos",
    ]),
    volume_replied: pickNumber(payload as Record<string, unknown>, [
      "replied",
      "volume_replied",
      "replies",
      "responses",
      "stats.replied",
      "metrics.replied",
      "stats.respondidos",
    ]),
    volume_failed: pickNumber(payload as Record<string, unknown>, [
      "failed",
      "volume_failed",
      "failures",
      "errors",
      "stats.failed",
      "metrics.failed",
      "stats.falhas",
    ]),
    cost: pickNumber(payload as Record<string, unknown>, [
      "cost",
      "amount",
      "value",
      "cost.total",
      "total_cost",
      "stats.cost",
    ]),
    funnel_label: pickString(payload as Record<string, unknown>, [
      "funnel",
      "funnel_name",
      "funnel_id",
    ]),
    campaign_name: pickString(payload as Record<string, unknown>, [
      "campaign_name",
      "campaign",
      "name",
      "title",
      "label",
      "disparo",
      "disparo_name",
    ]),
    template_name: pickString(payload as Record<string, unknown>, [
      "template_name",
      "template",
      "template_id",
      "template.name",
    ]),
    responsible_name: pickString(payload as Record<string, unknown>, [
      "responsible_name",
      "responsible",
      "responsavel",
      "user_name",
      "user",
      "sent_by",
      "responsible.name",
      "user.name",
    ]),
  };
}

export async function listDisparosByMentoria(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<DisparoEvent[]> {
  const { data, error } = await supabase
    .from("integration_events")
    .select(
      `
        id,
        source_id,
        mentoria_id,
        payload,
        status,
        error_message,
        source_event_id,
        received_at,
        processed_at,
        source:integration_sources!integration_events_source_id_fkey(slug)
      `
    )
    .eq("mentoria_id", mentoriaId)
    .order("received_at", { ascending: false })
    .returns<DisparoRow[]>();

  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.source?.slug === "fluxon")
    .map(toDisparoDTO);
}

async function resolveFluxonSourceId(
  supabase: SupabaseClient
): Promise<string> {
  const { data } = await supabase
    .from("integration_sources")
    .select("id")
    .eq("slug", "fluxon")
    .maybeSingle<{ id: string }>();

  if (data?.id) return data.id;

  const { data: inserted, error } = await supabase
    .from("integration_sources")
    .insert({
      slug: "fluxon",
      name: "Fluxon",
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return inserted.id;
}

export interface DisparoManualPayload {
  received_at: string;
  funnel_label: string | null;
  campaign_name: string | null;
  template_name: string | null;
  responsible_name: string | null;
  volume_sent: number;
  volume_delivered: number;
  volume_read: number;
  volume_replied: number;
  volume_failed: number;
  cost: number;
}

function buildDisparoPayload(input: DisparoManualPayload) {
  return {
    volume: input.volume_sent,
    volume_sent: input.volume_sent,
    volume_delivered: input.volume_delivered,
    volume_read: input.volume_read,
    volume_replied: input.volume_replied,
    volume_failed: input.volume_failed,
    cost: input.cost,
    funnel: input.funnel_label,
    funnel_name: input.funnel_label,
    campaign_name: input.campaign_name,
    template_name: input.template_name,
    responsible_name: input.responsible_name,
    source: "manual",
  };
}

export async function createManualDisparo(
  supabase: SupabaseClient,
  mentoriaId: string,
  input: DisparoManualPayload,
  options: { actorId?: string | null } = {}
): Promise<{ id: string }> {
  const sourceId = await resolveFluxonSourceId(supabase);

  const { data, error } = await supabase
    .from("integration_events")
    .insert({
      source_id: sourceId,
      mentoria_id: mentoriaId,
      payload: buildDisparoPayload(input),
      status: "processed",
      source_event_id: null,
      received_at: input.received_at,
      processed_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "create",
    entityType: "disparo",
    entityId: data.id,
    changes: { after: { mentoria_id: mentoriaId, ...input } },
  });

  return data;
}

export async function updateManualDisparo(
  supabase: SupabaseClient,
  eventId: string,
  input: DisparoManualPayload,
  options: { actorId?: string | null } = {}
): Promise<void> {
  const { data: before } = await supabase
    .from("integration_events")
    .select("payload, received_at")
    .eq("id", eventId)
    .maybeSingle<{
      payload: Record<string, unknown> | null;
      received_at: string;
    }>();

  const { error } = await supabase
    .from("integration_events")
    .update({
      payload: buildDisparoPayload(input),
      received_at: input.received_at,
    })
    .eq("id", eventId);

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "disparo",
    entityId: eventId,
    changes: {
      before: before ? (before as Record<string, unknown>) : null,
      after: input as unknown as Record<string, unknown>,
    },
  });
}

export async function deleteManualDisparo(
  supabase: SupabaseClient,
  eventId: string,
  options: { actorId?: string | null } = {}
): Promise<void> {
  const { error } = await supabase
    .from("integration_events")
    .delete()
    .eq("id", eventId);

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "delete",
    entityType: "disparo",
    entityId: eventId,
  });
}

export interface CompareResult {
  ids: string[];
  found: string[];
  missing: string[];
  mentorias: MentoriaWithMetrics[];
}

export async function compareByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<CompareResult> {
  const uniqueIds = Array.from(new Set(ids));

  const { data, error } = await supabase
    .from("mentorias")
    .select(MENTORIA_SELECT)
    .in("id", uniqueIds)
    .is("deleted_at", null)
    .returns<MentoriaRow[]>();

  if (error) throw error;

  const mentoriasById = new Map<string, MentoriaWithMetrics>();
  for (const row of data ?? []) {
    mentoriasById.set(row.id, toMentoriaDTO(row));
  }

  const ordered: MentoriaWithMetrics[] = [];
  const found: string[] = [];
  const missing: string[] = [];
  for (const id of uniqueIds) {
    const dto = mentoriasById.get(id);
    if (dto) {
      ordered.push(dto);
      found.push(id);
    } else {
      missing.push(id);
    }
  }

  return { ids: uniqueIds, found, missing, mentorias: ordered };
}

export interface InsertMentoriaMetricsInput {
  leads_grupo: number;
  leads_ao_vivo: number;
  agendamentos: number;
  calls_realizadas: number;
  vendas: number;
  valor_vendas: number;
  valor_entrada: number;
  investimento_trafego: number;
  investimento_api: number;
}

export async function insertMentoriaMetrics(
  supabase: SupabaseClient,
  mentoriaId: string,
  input: InsertMentoriaMetricsInput,
  options: { actorId?: string | null } = {}
): Promise<{ id: string }> {
  const row = {
    mentoria_id: mentoriaId,
    leads_grupo: input.leads_grupo,
    leads_ao_vivo: input.leads_ao_vivo,
    agendamentos: input.agendamentos,
    calls_realizadas: input.calls_realizadas,
    vendas: input.vendas,
    valor_vendas: input.valor_vendas,
    valor_entrada: input.valor_entrada,
    investimento_trafego: input.investimento_trafego,
    investimento_api: input.investimento_api,
    source: "manual" as const,
    captured_at: new Date().toISOString(),
    captured_by: options.actorId ?? null,
  };

  const { data, error } = await supabase
    .from("mentoria_metrics")
    .insert(row)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "create",
    entityType: "mentoria_metrics",
    entityId: data.id,
    changes: {
      after: {
        mentoria_id: mentoriaId,
        leads_grupo: input.leads_grupo,
        leads_ao_vivo: input.leads_ao_vivo,
        agendamentos: input.agendamentos,
        calls_realizadas: input.calls_realizadas,
        vendas: input.vendas,
        valor_vendas: input.valor_vendas,
        valor_entrada: input.valor_entrada,
        investimento_trafego: input.investimento_trafego,
        investimento_api: input.investimento_api,
      },
    },
  });

  return data;
}

export async function getMentoriaWithMetricsById(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<MentoriaWithMetrics | null> {
  const [{ data, error }, { data: liveStats }] = await Promise.all([
    supabase
      .from("mentorias")
      .select(MENTORIA_SELECT)
      .eq("id", mentoriaId)
      .is("deleted_at", null)
      .maybeSingle<MentoriaRow>(),
    supabase
      .rpc("get_mentoria_lead_stats", { p_mentoria_id: mentoriaId })
      .maybeSingle<LiveLeadStats>(),
  ]);

  if (error) throw error;
  if (!data) return null;
  return toMentoriaDTO(data, liveStats);
}
