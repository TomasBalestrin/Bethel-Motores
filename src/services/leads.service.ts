import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  LeadBulkInput,
  LeadCreateInput,
  LeadUpdateInput,
} from "@/lib/validators/lead";
import type { Lead, LeadsPage } from "@/types/lead";
import { logAudit } from "@/services/audit.service";
import {
  normalizeHandle,
  normalizeName,
  phoneIndexKey,
} from "@/lib/utils/matching";

const LEAD_COLUMNS =
  "id, funnel_id, name, phone, instagram_handle, revenue, niche, joined_group, confirmed_presence, attended, scheduled, sold, sale_value, entry_value, created_by, created_at, updated_at" as const;

function toRow(input: LeadCreateInput | LeadUpdateInput) {
  return {
    name: input.name,
    phone: input.phone ?? null,
    instagram_handle: input.instagram_handle ?? null,
    revenue: input.revenue ?? null,
    niche: input.niche ?? null,
    joined_group: input.joined_group ?? false,
    confirmed_presence: input.confirmed_presence ?? false,
    attended: input.attended ?? false,
    scheduled: input.scheduled ?? false,
    sold: input.sold ?? false,
    sale_value: input.sold ? input.sale_value ?? null : null,
    entry_value: input.sold ? input.entry_value ?? null : null,
  };
}

async function getMentoriaIdByFunnel(
  supabase: SupabaseClient,
  funnelId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("funnels")
    .select("mentoria_id")
    .eq("id", funnelId)
    .is("deleted_at", null)
    .maybeSingle<{ mentoria_id: string | null }>();
  return data?.mentoria_id ?? null;
}

async function getMentoriaIdByLead(
  supabase: SupabaseClient,
  leadId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("mentoria_leads")
    .select("funnel_id")
    .eq("id", leadId)
    .maybeSingle<{ funnel_id: string }>();
  if (!data) return null;
  return getMentoriaIdByFunnel(supabase, data.funnel_id);
}

export async function listLeadsByFunnelPaginated(
  supabase: SupabaseClient,
  funnelId: string,
  page = 1,
  pageSize = 100,
  query?: string
): Promise<LeadsPage> {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(500, Math.max(10, Math.floor(pageSize)));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let builder = supabase
    .from("mentoria_leads")
    .select(LEAD_COLUMNS, { count: "exact" })
    .eq("funnel_id", funnelId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  const term = query?.trim();
  if (term && term.length > 0) {
    const like = `%${term}%`;
    builder = builder.or(
      `name.ilike.${like},phone.ilike.${like},instagram_handle.ilike.${like},niche.ilike.${like}`
    );
  }

  const { data, error, count } = await builder.returns<Lead[]>();
  if (error) throw error;

  return {
    entries: data ?? [],
    total: count ?? (data?.length ?? 0),
    page: safePage,
    pageSize: safeSize,
  };
}

export async function countLeadsByFunnel(
  supabase: SupabaseClient,
  funnelId: string
): Promise<number> {
  const { count } = await supabase
    .from("mentoria_leads")
    .select("id", { count: "exact", head: true })
    .eq("funnel_id", funnelId)
    .is("deleted_at", null);
  return count ?? 0;
}

export async function createLead(
  supabase: SupabaseClient,
  funnelId: string,
  input: LeadCreateInput,
  options: { actorId?: string | null } = {}
): Promise<{ id: string }> {
  const row = {
    ...toRow(input),
    funnel_id: funnelId,
    created_by: options.actorId ?? null,
  };

  const { data, error } = await supabase
    .from("mentoria_leads")
    .insert(row)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "create",
    entityType: "lead",
    entityId: data.id,
    changes: { after: row as unknown as Record<string, unknown> },
  });

  const mentoriaId = await getMentoriaIdByFunnel(supabase, funnelId);
  if (mentoriaId) {
    await recalcMentoriaMetricsFromLeads(supabase, mentoriaId, {
      actorId: options.actorId ?? null,
    });
  }

  return data;
}

export async function bulkCreateLeads(
  supabase: SupabaseClient,
  funnelId: string,
  input: LeadBulkInput,
  options: { actorId?: string | null } = {}
): Promise<{ inserted: number; updated: number }> {
  type ExistingLead = {
    id: string;
    name: string;
    phone: string | null;
    instagram_handle: string | null;
    revenue: number | null;
    niche: string | null;
  };

  // Busca leads existentes do funil pra fazer match + merge-fill.
  const { data: existing } = await supabase
    .from("mentoria_leads")
    .select("id, name, phone, instagram_handle, revenue, niche")
    .eq("funnel_id", funnelId)
    .is("deleted_at", null)
    .limit(20_000)
    .returns<ExistingLead[]>();

  const byPhone = new Map<string, ExistingLead>();
  const byHandle = new Map<string, ExistingLead>();
  const byName = new Map<string, ExistingLead>();

  for (const lead of existing ?? []) {
    const phoneKey = phoneIndexKey(lead.phone);
    if (phoneKey && !byPhone.has(phoneKey)) byPhone.set(phoneKey, lead);
    const handleKey = normalizeHandle(lead.instagram_handle);
    if (handleKey && !byHandle.has(handleKey)) byHandle.set(handleKey, lead);
    const nameKey = normalizeName(lead.name);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, lead);
  }

  const toInsert: LeadCreateInput[] = [];
  const updates: { id: string; patch: Record<string, unknown> }[] = [];

  for (const lead of input.leads) {
    const phoneKey = phoneIndexKey(lead.phone);
    let match: ExistingLead | undefined;
    if (phoneKey) match = byPhone.get(phoneKey);
    if (!match) {
      const handleKey = normalizeHandle(lead.instagram_handle);
      if (handleKey) match = byHandle.get(handleKey);
    }
    if (!match) {
      const nameKey = normalizeName(lead.name);
      if (nameKey) match = byName.get(nameKey);
    }

    if (!match) {
      toInsert.push(lead);
      continue;
    }

    // Merge-fill: preenche só campos vazios no existente.
    const patch: Record<string, unknown> = {};
    if (!match.phone && lead.phone) patch.phone = lead.phone;
    if (!match.instagram_handle && lead.instagram_handle)
      patch.instagram_handle = lead.instagram_handle;
    if ((match.revenue == null) && lead.revenue != null)
      patch.revenue = lead.revenue;
    if (!match.niche && lead.niche) patch.niche = lead.niche;

    if (Object.keys(patch).length > 0) {
      updates.push({ id: match.id, patch });
    }
  }

  // Insere os novos em chunks.
  let inserted = 0;
  if (toInsert.length > 0) {
    const rows = toInsert.map((lead) => ({
      ...toRow(lead),
      funnel_id: funnelId,
      created_by: options.actorId ?? null,
    }));
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from("mentoria_leads").insert(chunk);
      if (error) throw error;
      inserted += chunk.length;
    }
  }

  // Atualiza os existentes (um por um, patches pequenos).
  let updated = 0;
  for (const { id, patch } of updates) {
    const { error } = await supabase
      .from("mentoria_leads")
      .update(patch)
      .eq("id", id);
    if (!error) updated += 1;
  }

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "create",
    entityType: "lead_bulk",
    entityId: funnelId,
    changes: { meta: { inserted, updated, total: input.leads.length } },
  });

  if (inserted > 0 || updated > 0) {
    const mentoriaId = await getMentoriaIdByFunnel(supabase, funnelId);
    if (mentoriaId) {
      await recalcMentoriaMetricsFromLeads(supabase, mentoriaId, {
        actorId: options.actorId ?? null,
      });
    }
  }

  return { inserted, updated };
}

export async function updateLead(
  supabase: SupabaseClient,
  leadId: string,
  input: LeadUpdateInput,
  options: { actorId?: string | null } = {}
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.phone !== undefined) patch.phone = input.phone ?? null;
  if (input.instagram_handle !== undefined)
    patch.instagram_handle = input.instagram_handle ?? null;
  if (input.revenue !== undefined) patch.revenue = input.revenue ?? null;
  if (input.niche !== undefined) patch.niche = input.niche ?? null;
  if (input.joined_group !== undefined) patch.joined_group = input.joined_group;
  if (input.confirmed_presence !== undefined)
    patch.confirmed_presence = input.confirmed_presence;
  if (input.attended !== undefined) patch.attended = input.attended;
  if (input.scheduled !== undefined) patch.scheduled = input.scheduled;
  if (input.sold !== undefined) patch.sold = input.sold;
  if (input.sale_value !== undefined) patch.sale_value = input.sale_value ?? null;
  if (input.entry_value !== undefined)
    patch.entry_value = input.entry_value ?? null;

  if (input.sold === false) {
    patch.sale_value = null;
    patch.entry_value = null;
  }

  const { error } = await supabase
    .from("mentoria_leads")
    .update(patch)
    .eq("id", leadId);

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "lead",
    entityId: leadId,
    changes: { after: patch },
  });

  const mentoriaId = await getMentoriaIdByLead(supabase, leadId);
  if (mentoriaId) {
    await recalcMentoriaMetricsFromLeads(supabase, mentoriaId, {
      actorId: options.actorId ?? null,
    });
  }
}

export async function deleteLead(
  supabase: SupabaseClient,
  leadId: string,
  options: { actorId?: string | null } = {}
): Promise<void> {
  const mentoriaId = await getMentoriaIdByLead(supabase, leadId);

  const { error } = await supabase
    .from("mentoria_leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", leadId);

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "delete",
    entityType: "lead",
    entityId: leadId,
  });

  if (mentoriaId) {
    await recalcMentoriaMetricsFromLeads(supabase, mentoriaId, {
      actorId: options.actorId ?? null,
    });
  }
}

interface LatestSnapshotManual {
  calls_realizadas: number;
  investimento_trafego: number;
  investimento_api: number;
}

async function latestManualSnapshot(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<LatestSnapshotManual> {
  const { data } = await supabase
    .from("mentoria_metrics")
    .select("calls_realizadas, investimento_trafego, investimento_api")
    .eq("mentoria_id", mentoriaId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      calls_realizadas: number | null;
      investimento_trafego: number | null;
      investimento_api: number | null;
    }>();

  return {
    calls_realizadas: Number(data?.calls_realizadas ?? 0),
    investimento_trafego: Number(data?.investimento_trafego ?? 0),
    investimento_api: Number(data?.investimento_api ?? 0),
  };
}

interface LeadAggregateRow {
  joined_group: boolean;
  attended: boolean;
  scheduled: boolean;
  sold: boolean;
  sale_value: number | null;
  entry_value: number | null;
}

export async function recalcMentoriaMetricsFromLeads(
  supabase: SupabaseClient,
  mentoriaId: string,
  options: { actorId?: string | null } = {}
): Promise<void> {
  const { data: funnels, error: funnelsError } = await supabase
    .from("funnels")
    .select("id")
    .eq("mentoria_id", mentoriaId)
    .is("deleted_at", null)
    .returns<{ id: string }[]>();

  if (funnelsError) return;

  const funnelIds = (funnels ?? []).map((row) => row.id);
  const baseline = await latestManualSnapshot(supabase, mentoriaId);

  let total_leads = 0;
  let leads_grupo = 0;
  let leads_ao_vivo = 0;
  let agendamentos = 0;
  let vendas = 0;
  let valor_vendas = 0;
  let valor_entrada = 0;

  if (funnelIds.length > 0) {
    const { data: leads, error: leadsError } = await supabase
      .from("mentoria_leads")
      .select(
        "joined_group, attended, scheduled, sold, sale_value, entry_value"
      )
      .in("funnel_id", funnelIds)
      .is("deleted_at", null)
      .limit(100_000)
      .returns<LeadAggregateRow[]>();

    if (leadsError) return;

    for (const lead of leads ?? []) {
      total_leads += 1;
      if (lead.joined_group) leads_grupo += 1;
      if (lead.attended) leads_ao_vivo += 1;
      if (lead.scheduled) agendamentos += 1;
      if (lead.sold) {
        vendas += 1;
        valor_vendas += Number(lead.sale_value ?? 0);
        valor_entrada += Number(lead.entry_value ?? 0);
      }
    }
  }

  const snapshot = {
    mentoria_id: mentoriaId,
    total_leads,
    leads_grupo,
    leads_ao_vivo,
    agendamentos,
    calls_realizadas: baseline.calls_realizadas,
    vendas,
    valor_vendas,
    valor_entrada,
    investimento_trafego: baseline.investimento_trafego,
    investimento_api: baseline.investimento_api,
    source: "manual" as const,
    captured_at: new Date().toISOString(),
    captured_by: options.actorId ?? null,
  };

  await supabase.from("mentoria_metrics").insert(snapshot);
}

export interface AttendanceEntry {
  name?: string | null;
  phone?: string | null;
  instagram_handle?: string | null;
}

export interface AttendanceResult {
  matched: number;
  updatedLeadIds: string[];
  notMatched: AttendanceEntry[];
}

interface LeadMatchRow {
  id: string;
  name: string;
  phone: string | null;
  instagram_handle: string | null;
}

function pushToIndex<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

export async function markAttendanceByMatching(
  supabase: SupabaseClient,
  mentoriaId: string,
  entries: AttendanceEntry[],
  options: { actorId?: string | null } = {}
): Promise<AttendanceResult> {
  const { data: funnels, error: funnelsError } = await supabase
    .from("funnels")
    .select("id")
    .eq("mentoria_id", mentoriaId)
    .is("deleted_at", null)
    .returns<{ id: string }[]>();

  if (funnelsError) throw funnelsError;
  const funnelIds = (funnels ?? []).map((row) => row.id);

  if (funnelIds.length === 0) {
    return { matched: 0, updatedLeadIds: [], notMatched: entries };
  }

  const { data: leads, error: leadsError } = await supabase
    .from("mentoria_leads")
    .select("id, name, phone, instagram_handle")
    .in("funnel_id", funnelIds)
    .is("deleted_at", null)
    .limit(10_000)
    .returns<LeadMatchRow[]>();

  if (leadsError) throw leadsError;

  const byPhone = new Map<string, LeadMatchRow[]>();
  const byHandle = new Map<string, LeadMatchRow[]>();
  const byName = new Map<string, LeadMatchRow[]>();

  for (const lead of leads ?? []) {
    const phoneKey = phoneIndexKey(lead.phone);
    if (phoneKey) pushToIndex(byPhone, phoneKey, lead);
    const handleKey = normalizeHandle(lead.instagram_handle);
    if (handleKey) pushToIndex(byHandle, handleKey, lead);
    const nameKey = normalizeName(lead.name);
    if (nameKey) pushToIndex(byName, nameKey, lead);
  }

  const matchedIds = new Set<string>();
  const notMatched: AttendanceEntry[] = [];

  for (const entry of entries) {
    const phoneKey = phoneIndexKey(entry.phone);
    let matches: LeadMatchRow[] | undefined;

    if (phoneKey) matches = byPhone.get(phoneKey);
    if (!matches || matches.length === 0) {
      const handleKey = normalizeHandle(entry.instagram_handle);
      if (handleKey) matches = byHandle.get(handleKey);
    }
    if (!matches || matches.length === 0) {
      const nameKey = normalizeName(entry.name);
      if (nameKey) matches = byName.get(nameKey);
    }

    if (!matches || matches.length === 0) {
      notMatched.push(entry);
      continue;
    }
    for (const lead of matches) matchedIds.add(lead.id);
  }

  const ids = Array.from(matchedIds);
  if (ids.length > 0) {
    const { error: updateError } = await supabase
      .from("mentoria_leads")
      .update({ attended: true })
      .in("id", ids);
    if (updateError) throw updateError;
  }

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "lead_attendance_bulk",
    entityId: mentoriaId,
    changes: {
      meta: {
        matched: ids.length,
        notMatched: notMatched.length,
        totalEntries: entries.length,
      },
    },
  });

  if (ids.length > 0) {
    await recalcMentoriaMetricsFromLeads(supabase, mentoriaId, {
      actorId: options.actorId ?? null,
    });
  }

  return {
    matched: ids.length,
    updatedLeadIds: ids,
    notMatched,
  };
}

export async function markGroupByMatching(
  supabase: SupabaseClient,
  mentoriaId: string,
  entries: AttendanceEntry[],
  options: { actorId?: string | null } = {}
): Promise<AttendanceResult> {
  const { data: funnels, error: funnelsError } = await supabase
    .from("funnels")
    .select("id")
    .eq("mentoria_id", mentoriaId)
    .is("deleted_at", null)
    .returns<{ id: string }[]>();

  if (funnelsError) throw funnelsError;
  const funnelIds = (funnels ?? []).map((row) => row.id);

  if (funnelIds.length === 0) {
    return { matched: 0, updatedLeadIds: [], notMatched: entries };
  }

  const { data: leads, error: leadsError } = await supabase
    .from("mentoria_leads")
    .select("id, name, phone, instagram_handle")
    .in("funnel_id", funnelIds)
    .is("deleted_at", null)
    .limit(10_000)
    .returns<LeadMatchRow[]>();

  if (leadsError) throw leadsError;

  const byPhone = new Map<string, LeadMatchRow[]>();
  const byHandle = new Map<string, LeadMatchRow[]>();
  const byName = new Map<string, LeadMatchRow[]>();

  for (const lead of leads ?? []) {
    const phoneKey = phoneIndexKey(lead.phone);
    if (phoneKey) pushToIndex(byPhone, phoneKey, lead);
    const handleKey = normalizeHandle(lead.instagram_handle);
    if (handleKey) pushToIndex(byHandle, handleKey, lead);
    const nameKey = normalizeName(lead.name);
    if (nameKey) pushToIndex(byName, nameKey, lead);
  }

  const matchedIds = new Set<string>();
  const notMatched: AttendanceEntry[] = [];

  for (const entry of entries) {
    const phoneKey = phoneIndexKey(entry.phone);
    let matches: LeadMatchRow[] | undefined;

    if (phoneKey) matches = byPhone.get(phoneKey);
    if (!matches || matches.length === 0) {
      const handleKey = normalizeHandle(entry.instagram_handle);
      if (handleKey) matches = byHandle.get(handleKey);
    }
    if (!matches || matches.length === 0) {
      const nameKey = normalizeName(entry.name);
      if (nameKey) matches = byName.get(nameKey);
    }

    if (!matches || matches.length === 0) {
      notMatched.push(entry);
      continue;
    }
    for (const lead of matches) matchedIds.add(lead.id);
  }

  const ids = Array.from(matchedIds);
  if (ids.length > 0) {
    const { error: updateError } = await supabase
      .from("mentoria_leads")
      .update({ joined_group: true })
      .in("id", ids);
    if (updateError) throw updateError;
  }

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "lead_group_bulk",
    entityId: mentoriaId,
    changes: {
      meta: {
        matched: ids.length,
        notMatched: notMatched.length,
        totalEntries: entries.length,
      },
    },
  });

  if (ids.length > 0) {
    await recalcMentoriaMetricsFromLeads(supabase, mentoriaId, {
      actorId: options.actorId ?? null,
    });
  }

  return {
    matched: ids.length,
    updatedLeadIds: ids,
    notMatched,
  };
}

export interface FunnelLeadAggregates {
  leads_do_funil: number;
  no_grupo: number;
  confirmaram: number;
  ao_vivo: number;
  agendados: number;
  vendas: number;
  valor_em_venda: number;
  valor_de_entrada: number;
}

export const FUNNEL_DERIVED_FIELD_KEYS = [
  "leads_do_funil",
  "no_grupo",
  "confirmaram",
  "ao_vivo",
  "agendados",
  "vendas",
  "valor_em_venda",
  "valor_de_entrada",
] as const;

interface LeadAggregateSourceRow {
  funnel_id: string;
  joined_group: boolean;
  confirmed_presence: boolean;
  attended: boolean;
  scheduled: boolean;
  sold: boolean;
  sale_value: number | null;
  entry_value: number | null;
}

function emptyAggregates(): FunnelLeadAggregates {
  return {
    leads_do_funil: 0,
    no_grupo: 0,
    confirmaram: 0,
    ao_vivo: 0,
    agendados: 0,
    vendas: 0,
    valor_em_venda: 0,
    valor_de_entrada: 0,
  };
}

export async function aggregatesByFunnel(
  supabase: SupabaseClient,
  funnelIds: string[]
): Promise<Map<string, FunnelLeadAggregates>> {
  const map = new Map<string, FunnelLeadAggregates>();
  if (funnelIds.length === 0) return map;

  const { data, error } = await supabase
    .from("mentoria_leads")
    .select(
      "funnel_id, joined_group, confirmed_presence, attended, scheduled, sold, sale_value, entry_value"
    )
    .in("funnel_id", funnelIds)
    .is("deleted_at", null)
    .limit(100_000)
    .returns<LeadAggregateSourceRow[]>();

  if (error || !data) return map;

  for (const row of data) {
    const agg = map.get(row.funnel_id) ?? emptyAggregates();
    agg.leads_do_funil += 1;
    if (row.joined_group) agg.no_grupo += 1;
    if (row.confirmed_presence) agg.confirmaram += 1;
    if (row.attended) agg.ao_vivo += 1;
    if (row.scheduled) agg.agendados += 1;
    if (row.sold) {
      agg.vendas += 1;
      agg.valor_em_venda += Number(row.sale_value ?? 0);
      agg.valor_de_entrada += Number(row.entry_value ?? 0);
    }
    map.set(row.funnel_id, agg);
  }

  return map;
}
