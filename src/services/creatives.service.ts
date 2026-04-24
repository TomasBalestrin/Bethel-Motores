import type { SupabaseClient } from "@supabase/supabase-js";

export type CreativeFormat = "video" | "static";

export interface MentoriaCreative {
  id: string;
  mentoria_id: string;
  code: string;
  format: CreativeFormat;
  headline: string | null;
  link: string | null;
  is_active: boolean;
  leads: number;
  qualified_leads: number;
  impressions: number;
  reach: number;
  clicks: number;
  hook_rate_3s: number | null;
  hold_50: number | null;
  hold_75: number | null;
  duration_seconds: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const CREATIVE_COLUMNS =
  "id, mentoria_id, code, format, headline, link, is_active, leads, qualified_leads, impressions, reach, clicks, hook_rate_3s, hold_50, hold_75, duration_seconds, notes, created_by, created_at, updated_at" as const;

export async function listCreativesByMentoria(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<MentoriaCreative[]> {
  const { data, error } = await supabase
    .from("mentoria_creatives")
    .select(CREATIVE_COLUMNS)
    .eq("mentoria_id", mentoriaId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<MentoriaCreative[]>();
  if (error) throw error;
  return data ?? [];
}

export interface CreativeCreateInput {
  code: string;
  format: CreativeFormat;
  headline?: string | null;
  link?: string | null;
  leads?: number;
  qualified_leads?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  hook_rate_3s?: number | null;
  hold_50?: number | null;
  hold_75?: number | null;
  duration_seconds?: number | null;
  notes?: string | null;
}

export async function createCreative(
  supabase: SupabaseClient,
  mentoriaId: string,
  input: CreativeCreateInput,
  options: { actorId?: string | null } = {}
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("mentoria_creatives")
    .insert({
      mentoria_id: mentoriaId,
      code: input.code,
      format: input.format,
      headline: input.headline ?? null,
      link: input.link ?? null,
      leads: input.leads ?? 0,
      qualified_leads: input.qualified_leads ?? 0,
      impressions: input.impressions ?? 0,
      reach: input.reach ?? 0,
      clicks: input.clicks ?? 0,
      hook_rate_3s: input.hook_rate_3s ?? null,
      hold_50: input.hold_50 ?? null,
      hold_75: input.hold_75 ?? null,
      duration_seconds: input.duration_seconds ?? null,
      notes: input.notes ?? null,
      created_by: options.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um criativo ativo com esse código");
    }
    throw error;
  }
  return data;
}

export interface CreativeUpdateInput {
  code?: string;
  format?: CreativeFormat;
  headline?: string | null;
  link?: string | null;
  is_active?: boolean;
  leads?: number;
  qualified_leads?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  hook_rate_3s?: number | null;
  hold_50?: number | null;
  hold_75?: number | null;
  duration_seconds?: number | null;
  notes?: string | null;
}

export async function updateCreative(
  supabase: SupabaseClient,
  creativeId: string,
  patch: CreativeUpdateInput
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("mentoria_creatives")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", creativeId)
    .is("deleted_at", null)
    .select("id")
    .single<{ id: string }>();
  if (error) throw error;
  return data;
}

export async function deleteCreative(
  supabase: SupabaseClient,
  creativeId: string
): Promise<void> {
  const { error } = await supabase
    .from("mentoria_creatives")
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", creativeId)
    .is("deleted_at", null);
  if (error) throw error;
}

export interface CreativeWithSpend extends MentoriaCreative {
  spent: number;
  entries_count: number;
  cpl: number | null;
  cpql: number | null;
  ctr: number | null; // porcentagem 0-100
  cpm: number | null;
}

export async function listCreativesWithSpend(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<CreativeWithSpend[]> {
  const creatives = await listCreativesByMentoria(supabase, mentoriaId);
  if (creatives.length === 0) return [];

  const { data: spendRows } = await supabase
    .from("mentoria_metrics")
    .select("creative_id, investimento_trafego")
    .eq("mentoria_id", mentoriaId)
    .gt("investimento_trafego", 0)
    .not("creative_id", "is", null)
    .returns<{ creative_id: string; investimento_trafego: number | null }[]>();

  const byCreative = new Map<string, { spent: number; count: number }>();
  for (const row of spendRows ?? []) {
    const cur = byCreative.get(row.creative_id) ?? { spent: 0, count: 0 };
    cur.spent += Number(row.investimento_trafego ?? 0);
    cur.count += 1;
    byCreative.set(row.creative_id, cur);
  }

  return creatives.map((c) => {
    const agg = byCreative.get(c.id) ?? { spent: 0, count: 0 };
    const spent = agg.spent;
    const cpl = c.leads > 0 ? spent / c.leads : null;
    const cpql = c.qualified_leads > 0 ? spent / c.qualified_leads : null;
    const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : null;
    const cpm = c.impressions > 0 ? (spent / c.impressions) * 1000 : null;
    return {
      ...c,
      spent,
      entries_count: agg.count,
      cpl,
      cpql,
      ctr,
      cpm,
    };
  });
}
