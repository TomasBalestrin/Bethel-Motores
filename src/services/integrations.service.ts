import type { SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

import type {
  IntegrationMapping,
  IntegrationType,
} from "@/lib/validators/integration";

export interface IntegrationSource {
  id: string;
  slug: string;
  name: string;
  type: IntegrationType;
  is_active: boolean;
  last_received_at: string | null;
  config: Record<string, unknown>;
  mapping: IntegrationMapping | Record<string, unknown>;
}

export interface IntegrationSourceWithSecret {
  id: string;
  slug: string;
  webhook_secret_hash: string | null;
  mapping: IntegrationMapping | Record<string, unknown>;
  is_active: boolean;
  type: IntegrationType;
}

const SOURCE_LIST_COLUMNS =
  "id, slug, name, type, is_active, last_received_at, config, mapping" as const;

export async function listSources(
  supabase: SupabaseClient
): Promise<IntegrationSource[]> {
  const { data, error } = await supabase
    .from("integration_sources")
    .select(SOURCE_LIST_COLUMNS)
    .order("name", { ascending: true })
    .returns<IntegrationSource[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getSourceBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<IntegrationSourceWithSecret | null> {
  const { data, error } = await supabase
    .from("integration_sources")
    .select(
      "id, slug, webhook_secret_hash, mapping, is_active, type"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<IntegrationSourceWithSecret>();

  if (error) throw error;
  return data;
}

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export interface CreateSourceInput {
  slug: string;
  name: string;
  type: IntegrationType;
  mapping: IntegrationMapping;
  config?: Record<string, unknown>;
}

export interface CreateSourceResult {
  id: string;
  slug: string;
  secret: string;
}

export async function createSource(
  supabase: SupabaseClient,
  input: CreateSourceInput,
  options: { actorId?: string } = {}
): Promise<CreateSourceResult> {
  const secret = generateSecret();
  const hash = await bcrypt.hash(secret, 10);

  const { data, error } = await supabase
    .from("integration_sources")
    .insert({
      slug: input.slug,
      name: input.name,
      type: input.type,
      mapping: input.mapping,
      config: input.config ?? {},
      webhook_secret_hash: hash,
      is_active: true,
      created_by: options.actorId ?? null,
    })
    .select("id, slug")
    .single<{ id: string; slug: string }>();

  if (error) throw error;
  return { id: data.id, slug: data.slug, secret };
}

export interface UpdateSourceInput {
  name?: string;
  type?: IntegrationType;
  mapping?: IntegrationMapping;
  config?: Record<string, unknown>;
  is_active?: boolean;
}

export async function updateMapping(
  supabase: SupabaseClient,
  id: string,
  patch: UpdateSourceInput
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("integration_sources")
    .update(patch)
    .eq("id", id)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}

export async function rotateSourceSecret(
  supabase: SupabaseClient,
  id: string
): Promise<{ id: string; secret: string }> {
  const secret = generateSecret();
  const hash = await bcrypt.hash(secret, 10);

  const { data, error } = await supabase
    .from("integration_sources")
    .update({ webhook_secret_hash: hash })
    .eq("id", id)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return { id: data.id, secret };
}

export interface ReprocessResult {
  id: string;
  status: "pending";
}

export async function reprocessEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<ReprocessResult> {
  const { data, error } = await supabase
    .from("integration_events")
    .update({
      status: "pending",
      error_message: null,
      processed_at: null,
    })
    .eq("id", eventId)
    .select("id, status")
    .single<{ id: string; status: "pending" }>();

  if (error) throw error;
  return data;
}

export async function getEventById(
  supabase: SupabaseClient,
  eventId: string
) {
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
        source:integration_sources!integration_events_source_id_fkey(id, slug, name)
      `
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export interface InsertEventInput {
  source_id: string;
  mentoria_id: string | null;
  payload: Record<string, unknown>;
  source_event_id: string | null;
}

export interface InsertEventResult {
  id: string;
  duplicate: boolean;
}

export async function insertEvent(
  supabase: SupabaseClient,
  input: InsertEventInput
): Promise<InsertEventResult> {
  if (input.source_event_id) {
    const existing = await supabase
      .from("integration_events")
      .select("id")
      .eq("source_id", input.source_id)
      .eq("source_event_id", input.source_event_id)
      .maybeSingle<{ id: string }>();

    if (existing.data) {
      return { id: existing.data.id, duplicate: true };
    }
  }

  const { data, error } = await supabase
    .from("integration_events")
    .insert({
      source_id: input.source_id,
      mentoria_id: input.mentoria_id,
      payload: input.payload,
      source_event_id: input.source_event_id,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return { id: data.id, duplicate: false };
}

export async function markEventProcessed(
  supabase: SupabaseClient,
  eventId: string,
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  await supabase
    .from("integration_events")
    .update({
      status: ok ? "processed" : "error",
      processed_at: new Date().toISOString(),
      error_message: ok ? null : errorMessage ?? null,
    })
    .eq("id", eventId);
}

export async function touchSourceLastReceived(
  supabase: SupabaseClient,
  sourceId: string
): Promise<void> {
  await supabase
    .from("integration_sources")
    .update({ last_received_at: new Date().toISOString() })
    .eq("id", sourceId);
}

export interface RecentIntegrationEvent {
  id: string;
  status: "pending" | "processed" | "error" | "skipped";
  received_at: string;
  processed_at: string | null;
  source_event_id: string | null;
  error_message: string | null;
  mentoria_id: string | null;
  payload: Record<string, unknown>;
}

export interface SourceWithRecentEvents extends IntegrationSource {
  recent_events: RecentIntegrationEvent[];
}

export async function getSourceWithRecentEvents(
  supabase: SupabaseClient,
  id: string,
  limit = 10
): Promise<SourceWithRecentEvents | null> {
  const { data, error } = await supabase
    .from("integration_sources")
    .select(SOURCE_LIST_COLUMNS)
    .eq("id", id)
    .maybeSingle<IntegrationSource>();

  if (error) throw error;
  if (!data) return null;

  const eventsResult = await supabase
    .from("integration_events")
    .select(
      "id, status, received_at, processed_at, source_event_id, error_message, mentoria_id, payload"
    )
    .eq("source_id", id)
    .order("received_at", { ascending: false })
    .limit(limit)
    .returns<RecentIntegrationEvent[]>();

  return {
    ...data,
    recent_events: eventsResult.data ?? [],
  };
}

export interface MetaAdsMapping {
  campaign_id: string;
  target_type: "post" | "mentoria";
  target_id: string;
}

export interface MetaAdsSyncResult {
  applied: number;
  skipped: string[];
  insights_count: number;
}

export interface SyncMetaAdsSpendInput {
  insights: {
    campaign_id: string;
    campaign_name: string;
    spend: number;
    reach: number;
    impressions: number;
    clicks: number;
    date_start: string;
    date_stop: string;
  }[];
  mappings: MetaAdsMapping[];
  actorId?: string;
}

export async function syncMetaAdsSpend(
  supabase: SupabaseClient,
  input: SyncMetaAdsSpendInput
): Promise<MetaAdsSyncResult> {
  const mappingByCampaign = new Map<string, MetaAdsMapping>();
  for (const mapping of input.mappings) {
    mappingByCampaign.set(mapping.campaign_id, mapping);
  }

  const capturedAt = new Date().toISOString();
  const postRows: Record<string, unknown>[] = [];
  const mentoriaRows: Record<string, unknown>[] = [];
  const skipped: string[] = [];

  for (const insight of input.insights) {
    const mapping = mappingByCampaign.get(insight.campaign_id);
    if (!mapping) {
      skipped.push(insight.campaign_id);
      continue;
    }

    if (mapping.target_type === "post") {
      postRows.push({
        post_id: mapping.target_id,
        investment: insight.spend,
        spend: insight.spend,
        reach: insight.reach,
        impressions: insight.impressions,
        clicks: insight.clicks,
        followers_gained: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        captured_at: capturedAt,
        captured_by: input.actorId ?? null,
      });
    } else {
      mentoriaRows.push({
        mentoria_id: mapping.target_id,
        investimento_trafego: insight.spend,
        investimento_api: 0,
        leads_grupo: 0,
        leads_ao_vivo: 0,
        agendamentos: 0,
        calls_realizadas: 0,
        vendas: 0,
        valor_vendas: 0,
        valor_entrada: 0,
        source: "api",
        captured_at: capturedAt,
        captured_by: input.actorId ?? null,
      });
    }
  }

  let applied = 0;
  if (postRows.length > 0) {
    const { error } = await supabase.from("post_metrics").insert(postRows);
    if (error) throw error;
    applied += postRows.length;
  }
  if (mentoriaRows.length > 0) {
    const { error } = await supabase
      .from("mentoria_metrics")
      .insert(mentoriaRows);
    if (error) throw error;
    applied += mentoriaRows.length;
  }

  return {
    applied,
    skipped,
    insights_count: input.insights.length,
  };
}
