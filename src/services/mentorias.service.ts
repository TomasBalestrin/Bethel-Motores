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
  TrafegoPlatform,
} from "@/lib/validators/mentoria";
import type { MentoriaFilters, MentoriaWithMetrics } from "@/types/mentoria";
import { logAudit } from "@/services/audit.service";

export type { TrafegoPlatform };

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

// Hints para o PostgREST limitar o embedded mentoria_metrics à snapshot mais
// recente. Sem isso, o select traz TODAS as snapshots por mentoria.
const LATEST_SNAPSHOT_FOREIGN = "latest_metrics" as const;

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
    .is("deleted_at", null)
    .order("captured_at", {
      foreignTable: LATEST_SNAPSHOT_FOREIGN,
      ascending: false,
    })
    .limit(1, { foreignTable: LATEST_SNAPSHOT_FOREIGN });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.query && filters.query.trim().length > 0) {
    query = query.ilike("name", `%${filters.query.trim()}%`);
  }

  const { data, error } = await query.returns<MentoriaRow[]>();
  if (error) throw error;

  const rows = data ?? [];
  // Live stats por mentoria via RPC (paralelo). Mantém consistência com
  // /motors/mentorias/[id] que também usa get_mentoria_lead_stats.
  const liveById = await fetchLiveStatsForMentorias(
    supabase,
    rows.map((row) => row.id)
  );

  const mentorias = rows.map((row) =>
    toMentoriaDTO(row, liveById.get(row.id) ?? null)
  );
  return applySort(mentorias, filters.sort);
}

async function fetchLiveStatsForMentorias(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, LiveLeadStats>> {
  const map = new Map<string, LiveLeadStats>();
  if (ids.length === 0) return map;
  const results = await Promise.all(
    ids.map(async (id) => {
      const { data } = await supabase
        .rpc("get_mentoria_lead_stats", { p_mentoria_id: id })
        .maybeSingle<LiveLeadStats>();
      return [id, data] as const;
    })
  );
  for (const [id, stats] of results) {
    if (stats) map.set(id, stats);
  }
  return map;
}

export interface CreateMentoriaOptions {
  actorId?: string;
}

async function assertSpecialistExists(
  supabase: SupabaseClient,
  specialistId: string
): Promise<void> {
  const { data } = await supabase
    .from("social_profiles")
    .select("id")
    .eq("id", specialistId)
    .is("deleted_at", null)
    .maybeSingle<{ id: string }>();

  if (!data) {
    throw new Error("Especialista não encontrado");
  }
}

export async function createMentoria(
  supabase: SupabaseClient,
  input: MentoriaCreateInput,
  options: CreateMentoriaOptions = {}
): Promise<{ id: string }> {
  await assertSpecialistExists(supabase, input.specialist_id);

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
  if (patch.specialist_id !== undefined) {
    await assertSpecialistExists(supabase, patch.specialist_id);
  }

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

export interface TrafegoEntry {
  id: string;
  captured_at: string;
  investimento_trafego: number;
  investimento_api: number;
  source: "manual" | "webhook" | "api";
  platform: TrafegoPlatform | null;
  creative_id: string | null;
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
  creative_id: string | null;
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
        creative_id,
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
    creative_id: row.creative_id,
    captured_by: row.captured_by,
    responsavel_nome: row.captured_by_profile?.name ?? null,
    notes: null,
  }));
}

export interface InsertTrafegoInput {
  value: number;
  platform?: TrafegoPlatform;
  creativeId?: string | null;
  capturedAt?: string;
  actorId?: string | null;
}

export async function insertTrafegoEntry(
  supabase: SupabaseClient,
  mentoriaId: string,
  input: InsertTrafegoInput
): Promise<{ id: string }> {
  // mentoria_metrics é lido como "estado atual" pegando a snapshot mais
  // recente. Lançamentos de tráfego precisam carregar os campos manuais
  // (calls, vendas, leads, etc) — senão a próxima leitura zera esses campos.
  // O campo investimento_trafego desta linha continua sendo o delta;
  // listTrafegoByMentoria usa `platform IS NOT NULL` como discriminador.
  const baseline = await latestSnapshotForMentoria(supabase, mentoriaId);

  const { data, error } = await supabase
    .from("mentoria_metrics")
    .insert({
      mentoria_id: mentoriaId,
      investimento_trafego: input.value,
      investimento_api: 0,
      total_leads: baseline.total_leads,
      leads_grupo: baseline.leads_grupo,
      leads_ao_vivo: baseline.leads_ao_vivo,
      agendamentos: baseline.agendamentos,
      calls_realizadas: baseline.calls_realizadas,
      vendas: baseline.vendas,
      valor_vendas: baseline.valor_vendas,
      valor_entrada: baseline.valor_entrada,
      source: "manual",
      platform: input.platform ?? "meta_ads",
      creative_id: input.creativeId ?? null,
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
  platform?: TrafegoPlatform;
  creativeId?: string | null;
  capturedAt: string;
}

export async function insertTrafegoBatch(
  supabase: SupabaseClient,
  mentoriaId: string,
  entries: BatchTrafegoEntry[],
  options: { actorId?: string | null } = {}
): Promise<number> {
  if (entries.length === 0) return 0;
  // Cada lançamento de tráfego precisa carregar os campos manuais — senão
  // o reader "latest snapshot" zera calls/leads/vendas após o batch.
  const baseline = await latestSnapshotForMentoria(supabase, mentoriaId);

  const rows = entries.map((e) => ({
    mentoria_id: mentoriaId,
    investimento_trafego: e.value,
    investimento_api: 0,
    total_leads: baseline.total_leads,
    leads_grupo: baseline.leads_grupo,
    leads_ao_vivo: baseline.leads_ao_vivo,
    agendamentos: baseline.agendamentos,
    calls_realizadas: baseline.calls_realizadas,
    vendas: baseline.vendas,
    valor_vendas: baseline.valor_vendas,
    valor_entrada: baseline.valor_entrada,
    source: "manual" as const,
    platform: e.platform ?? "meta_ads",
    creative_id: e.creativeId ?? null,
    captured_at: e.capturedAt,
    captured_by: options.actorId ?? null,
  }));
  const { error } = await supabase.from("mentoria_metrics").insert(rows);
  if (error) throw error;
  return rows.length;
}

interface LatestSnapshotState {
  total_leads: number;
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

const EMPTY_SNAPSHOT: LatestSnapshotState = {
  total_leads: 0,
  leads_grupo: 0,
  leads_ao_vivo: 0,
  agendamentos: 0,
  calls_realizadas: 0,
  vendas: 0,
  valor_vendas: 0,
  valor_entrada: 0,
  investimento_trafego: 0,
  investimento_api: 0,
};

async function latestSnapshotForMentoria(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<LatestSnapshotState> {
  const { data } = await supabase
    .from("mentoria_metrics")
    .select(
      "total_leads, leads_grupo, leads_ao_vivo, agendamentos, calls_realizadas, vendas, valor_vendas, valor_entrada, investimento_trafego, investimento_api"
    )
    .eq("mentoria_id", mentoriaId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
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
    }>();

  if (!data) return { ...EMPTY_SNAPSHOT };
  return {
    total_leads: Number(data.total_leads ?? 0),
    leads_grupo: Number(data.leads_grupo ?? 0),
    leads_ao_vivo: Number(data.leads_ao_vivo ?? 0),
    agendamentos: Number(data.agendamentos ?? 0),
    calls_realizadas: Number(data.calls_realizadas ?? 0),
    vendas: Number(data.vendas ?? 0),
    valor_vendas: Number(data.valor_vendas ?? 0),
    valor_entrada: Number(data.valor_entrada ?? 0),
    investimento_trafego: Number(data.investimento_trafego ?? 0),
    investimento_api: Number(data.investimento_api ?? 0),
  };
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

export interface TrafegoKPIs {
  total_investido: number;
  traffic_budget: number | null;
  total_leads: number;
  qualified_leads: number;
  vendas: number;
  cpl: number | null;
  cpql: number | null;
  cac: number | null;
  burn_rate_pct: number | null;
  traffic_funnels_count: number;
  creatives_count: number;
  creatives_video: number;
  creatives_static: number;
}

export async function getTrafegoKPIs(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<TrafegoKPIs> {
  const [entries, mentoria, trafficFunnelsResult, creativesResult] =
    await Promise.all([
      listTrafegoByMentoria(supabase, mentoriaId).catch(
        () => [] as TrafegoEntry[]
      ),
      getMentoriaById(supabase, mentoriaId),
      supabase
        .from("funnels")
        .select("id")
        .eq("mentoria_id", mentoriaId)
        .eq("is_traffic_funnel", true)
        .is("deleted_at", null)
        .returns<{ id: string }[]>(),
      supabase
        .from("mentoria_creatives")
        .select("id, format")
        .eq("mentoria_id", mentoriaId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .returns<{ id: string; format: "video" | "static" }[]>(),
    ]);

  const totalInvestido = entries.reduce(
    (sum, e) => sum + (e.investimento_trafego ?? 0),
    0
  );
  const trafficBudget = mentoria?.traffic_budget ?? null;

  const trafficFunnelIds =
    trafficFunnelsResult.data?.map((f) => f.id) ?? [];
  let totalLeads = 0;
  let vendas = 0;
  let qualifiedLeads = 0;

  if (trafficFunnelIds.length > 0) {
    const [{ data: aggRows }, { count: qualifiedCount }] = await Promise.all([
      supabase.rpc("get_funnel_lead_aggregates", {
        funnel_ids: trafficFunnelIds,
      }),
      supabase
        .from("mentoria_leads")
        .select("id", { count: "exact", head: true })
        .in("funnel_id", trafficFunnelIds)
        .eq("is_qualified", true)
        .is("deleted_at", null),
    ]);
    if (Array.isArray(aggRows)) {
      for (const row of aggRows as Array<{
        leads_do_funil: number | null;
        vendas: number | null;
      }>) {
        totalLeads += Number(row.leads_do_funil ?? 0);
        vendas += Number(row.vendas ?? 0);
      }
    }
    qualifiedLeads = Number(qualifiedCount ?? 0);
  }

  const creatives = creativesResult.data ?? [];
  const creativesVideo = creatives.filter((c) => c.format === "video").length;
  const creativesStatic = creatives.filter((c) => c.format === "static").length;

  const cpl = totalLeads > 0 ? totalInvestido / totalLeads : null;
  const cpql = qualifiedLeads > 0 ? totalInvestido / qualifiedLeads : null;
  const cac = vendas > 0 ? totalInvestido / vendas : null;
  const burnRatePct =
    trafficBudget && trafficBudget > 0
      ? (totalInvestido / trafficBudget) * 100
      : null;

  return {
    total_investido: totalInvestido,
    traffic_budget: trafficBudget,
    total_leads: totalLeads,
    qualified_leads: qualifiedLeads,
    vendas,
    cpl,
    cpql,
    cac,
    burn_rate_pct: burnRatePct,
    traffic_funnels_count: trafficFunnelIds.length,
    creatives_count: creatives.length,
    creatives_video: creativesVideo,
    creatives_static: creativesStatic,
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

function pickPath(payload: unknown, path: string): unknown {
  if (payload == null) return undefined;
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

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const named = (value as Record<string, unknown>)["name"];
    if (typeof named === "string" && named.trim().length > 0) return named;
  }
  return null;
}

// Faz um BFS único no payload e indexa todos os valores por nome de chave
// (lowercase). Custa O(nodes) por evento ao invés de O(nodes × campos).
function indexPayloadByKey(payload: unknown): Map<string, unknown[]> {
  const index = new Map<string, unknown[]>();
  if (payload == null || typeof payload !== "object") return index;
  const queue: unknown[] = [payload];
  const visited = new WeakSet<object>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current as object)) continue;
    visited.add(current as object);
    if (Array.isArray(current)) {
      for (const v of current) queue.push(v);
      continue;
    }
    for (const [k, v] of Object.entries(current as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      const bucket = index.get(lower);
      if (bucket) bucket.push(v);
      else index.set(lower, [v]);
      if (v && typeof v === "object") queue.push(v);
    }
  }
  return index;
}

function pickNumberFromIndex(
  payload: unknown,
  index: Map<string, unknown[]>,
  keys: string[]
): number {
  for (const key of keys) {
    if (key.includes(".")) {
      const direct = pickPath(payload, key);
      const asNum = coerceNumber(direct);
      if (asNum !== null) return asNum;
      continue;
    }
    const bucket = index.get(key.toLowerCase());
    if (!bucket) continue;
    for (const v of bucket) {
      const asNum = coerceNumber(v);
      if (asNum !== null) return asNum;
    }
  }
  return 0;
}

function pickStringFromIndex(
  payload: unknown,
  index: Map<string, unknown[]>,
  keys: string[]
): string | null {
  for (const key of keys) {
    if (key.includes(".")) {
      const direct = pickPath(payload, key);
      const asStr = coerceString(direct);
      if (asStr !== null) return asStr;
      continue;
    }
    const bucket = index.get(key.toLowerCase());
    if (!bucket) continue;
    for (const v of bucket) {
      const asStr = coerceString(v);
      if (asStr !== null) return asStr;
    }
  }
  return null;
}

function toDisparoDTO(row: DisparoRow): DisparoEvent {
  const payload = row.payload ?? {};
  const index = indexPayloadByKey(payload);
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
    volume_sent: pickNumberFromIndex(payload, index, [
      "volume",
      "volume_sent",
      "sent",
      "stats.sent",
      "metrics.sent",
      "stats.enviados",
    ]),
    volume_delivered: pickNumberFromIndex(payload, index, [
      "volume_delivered",
      "delivered",
      "stats.delivered",
      "metrics.delivered",
      "stats.entregues",
    ]),
    volume_read: pickNumberFromIndex(payload, index, [
      "read",
      "volume_read",
      "reads",
      "stats.read",
      "metrics.read",
      "stats.lidos",
    ]),
    volume_replied: pickNumberFromIndex(payload, index, [
      "replied",
      "volume_replied",
      "replies",
      "responses",
      "stats.replied",
      "metrics.replied",
      "stats.respondidos",
    ]),
    volume_failed: pickNumberFromIndex(payload, index, [
      "failed",
      "volume_failed",
      "failures",
      "errors",
      "stats.failed",
      "metrics.failed",
      "stats.falhas",
    ]),
    cost: pickNumberFromIndex(payload, index, [
      "cost",
      "amount",
      "value",
      "cost.total",
      "total_cost",
      "stats.cost",
    ]),
    funnel_label: pickStringFromIndex(payload, index, [
      "funnel",
      "funnel_name",
      "funnel_id",
    ]),
    campaign_name: pickStringFromIndex(payload, index, [
      "campaign_name",
      "campaign",
      "disparo_name",
      "disparo",
      "broadcast_name",
      "broadcast",
      "title",
    ]),
    template_name: pickStringFromIndex(payload, index, [
      "template_name",
      "template",
      "template_id",
      "template.name",
    ]),
    responsible_name: pickStringFromIndex(payload, index, [
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
  // Não cria a source automaticamente. Criar com is_active=true e sem
  // webhook_secret_hash deixava o source pronto pra rejeitar webhooks
  // inbound silenciosamente. Se a source não existe, falha explícita pra
  // que admin a configure em /settings/integrations.
  const { data } = await supabase
    .from("integration_sources")
    .select("id")
    .eq("slug", "fluxon")
    .maybeSingle<{ id: string }>();

  if (!data?.id) {
    throw new Error(
      "Integração 'fluxon' não cadastrada. Configure em Settings → Integrações antes de criar disparos manuais."
    );
  }
  return data.id;
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
  // Eventos vindos de webhook (source_event_id != null) carregam o payload
  // bruto recebido pela integração; sobrescrever destruiria a auditoria.
  // Edição manual só é permitida em entradas criadas via createManualDisparo
  // (que sempre tem source_event_id NULL).
  const { data: before } = await supabase
    .from("integration_events")
    .select("payload, received_at, source_event_id")
    .eq("id", eventId)
    .maybeSingle<{
      payload: Record<string, unknown> | null;
      received_at: string;
      source_event_id: string | null;
    }>();

  if (!before) {
    throw new Error("Disparo não encontrado");
  }
  if (before.source_event_id !== null) {
    throw new Error(
      "Este disparo veio de webhook e não pode ser editado — preserva auditoria do payload original"
    );
  }

  const { error } = await supabase
    .from("integration_events")
    .update({
      payload: buildDisparoPayload(input),
      received_at: input.received_at,
    })
    .eq("id", eventId)
    .is("source_event_id", null);

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "disparo",
    entityId: eventId,
    changes: {
      before: before as Record<string, unknown>,
      after: input as unknown as Record<string, unknown>,
    },
  });
}

export async function deleteManualDisparo(
  supabase: SupabaseClient,
  eventId: string,
  options: { actorId?: string | null } = {}
): Promise<void> {
  // Mesmo guard de updateManualDisparo: só remove eventos manuais.
  const { data: before } = await supabase
    .from("integration_events")
    .select("source_event_id")
    .eq("id", eventId)
    .maybeSingle<{ source_event_id: string | null }>();

  if (!before) {
    throw new Error("Disparo não encontrado");
  }
  if (before.source_event_id !== null) {
    throw new Error(
      "Este disparo veio de webhook e não pode ser excluído — preserva auditoria do payload original"
    );
  }

  const { error } = await supabase
    .from("integration_events")
    .delete()
    .eq("id", eventId)
    .is("source_event_id", null);

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

  const [{ data, error }, liveById] = await Promise.all([
    supabase
      .from("mentorias")
      .select(MENTORIA_SELECT)
      .in("id", uniqueIds)
      .is("deleted_at", null)
      .order("captured_at", {
        foreignTable: LATEST_SNAPSHOT_FOREIGN,
        ascending: false,
      })
      .limit(1, { foreignTable: LATEST_SNAPSHOT_FOREIGN })
      .returns<MentoriaRow[]>(),
    fetchLiveStatsForMentorias(supabase, uniqueIds),
  ]);

  if (error) throw error;

  const mentoriasById = new Map<string, MentoriaWithMetrics>();
  for (const row of data ?? []) {
    mentoriasById.set(row.id, toMentoriaDTO(row, liveById.get(row.id) ?? null));
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
      .order("captured_at", {
        foreignTable: LATEST_SNAPSHOT_FOREIGN,
        ascending: false,
      })
      .limit(1, { foreignTable: LATEST_SNAPSHOT_FOREIGN })
      .maybeSingle<MentoriaRow>(),
    supabase
      .rpc("get_mentoria_lead_stats", { p_mentoria_id: mentoriaId })
      .maybeSingle<LiveLeadStats>(),
  ]);

  if (error) throw error;
  if (!data) return null;
  return toMentoriaDTO(data, liveStats);
}
