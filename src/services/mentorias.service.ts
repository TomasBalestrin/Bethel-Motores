import type { SupabaseClient } from "@supabase/supabase-js";
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
  latest_metrics:
    | {
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
  latest_metrics:mentoria_metrics(
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

function toMentoriaDTO(row: MentoriaRow): MentoriaWithMetrics {
  const snapshots = row.latest_metrics ?? [];
  const latest = snapshots.length
    ? [...snapshots].sort(
        (a, b) =>
          new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
      )[0] ?? null
    : null;

  const leadsGrupo = Number(latest?.leads_grupo ?? 0);
  const leadsAoVivo = Number(latest?.leads_ao_vivo ?? 0);
  const agendamentos = Number(latest?.agendamentos ?? 0);
  const callsRealizadas = Number(latest?.calls_realizadas ?? 0);
  const vendas = Number(latest?.vendas ?? 0);

  return {
    id: row.id,
    name: row.name,
    scheduled_at: row.scheduled_at,
    status: row.status,
    specialist: row.specialist ?? null,
    leads_grupo: leadsGrupo,
    leads_ao_vivo: leadsAoVivo,
    agendamentos,
    calls_realizadas: callsRealizadas,
    vendas,
    valor_vendas: Number(latest?.valor_vendas ?? 0),
    valor_entrada: Number(latest?.valor_entrada ?? 0),
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

  const mentorias = (data ?? []).map(toMentoriaDTO);
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

export async function getMentoriaById(
  supabase: SupabaseClient,
  id: string
) {
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
}

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

export interface TrafegoEntry {
  id: string;
  captured_at: string;
  investimento_trafego: number;
  investimento_api: number;
  source: "manual" | "webhook" | "api";
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
    captured_by: row.captured_by,
    responsavel_nome: row.captured_by_profile?.name ?? null,
    notes: null,
  }));
}

export interface InsertTrafegoInput {
  value: number;
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
      captured_at: input.capturedAt ?? new Date().toISOString(),
      captured_by: input.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
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
  cost: number;
  funnel_label: string | null;
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

function pickNumber(payload: Record<string, unknown> | null, keys: string[]): number {
  if (!payload) return 0;
  for (const key of keys) {
    const value = (payload as Record<string, unknown>)[key];
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
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
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
    ]),
    volume_delivered: pickNumber(payload as Record<string, unknown>, [
      "volume_delivered",
      "delivered",
    ]),
    cost: pickNumber(payload as Record<string, unknown>, ["cost", "amount", "value"]),
    funnel_label: pickString(payload as Record<string, unknown>, [
      "funnel",
      "funnel_name",
      "funnel_id",
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
