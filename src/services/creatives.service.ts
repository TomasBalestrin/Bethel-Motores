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
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const CREATIVE_COLUMNS =
  "id, mentoria_id, code, format, headline, link, is_active, created_by, created_at, updated_at" as const;

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
    return {
      ...c,
      spent: agg.spent,
      entries_count: agg.count,
    };
  });
}
