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
  normalizePhone,
  phoneIndexKey,
} from "@/lib/utils/matching";

const LEAD_COLUMNS =
  "id, funnel_id, name, phone, instagram_handle, revenue, niche, joined_group, confirmed_presence, attended, scheduled, sold, sale_value, entry_value, created_by, created_at, updated_at" as const;

function toRow(input: LeadCreateInput | LeadUpdateInput) {
  return {
    name: input.name,
    phone: normalizePhone(input.phone) ?? null,
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

export async function listLeadsByMentoriaPaginated(
  supabase: SupabaseClient,
  mentoriaId: string,
  page = 1,
  pageSize = 100,
  query?: string
): Promise<LeadsPage> {
  const { data: funnelRows } = await supabase
    .from("funnels")
    .select("id")
    .eq("mentoria_id", mentoriaId)
    .is("deleted_at", null)
    .returns<{ id: string }[]>();

  const funnelIds = (funnelRows ?? []).map((f) => f.id);
  if (funnelIds.length === 0) {
    return { entries: [], total: 0, page, pageSize };
  }

  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(500, Math.max(10, Math.floor(pageSize)));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let builder = supabase
    .from("mentoria_leads")
    .select(LEAD_COLUMNS, { count: "exact" })
    .in("funnel_id", funnelIds)
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

export async function bulkDeleteLeads(
  supabase: SupabaseClient,
  funnelId: string,
  ids: string[],
  options: { actorId?: string | null } = {}
): Promise<void> {
  const { error } = await supabase
    .from("mentoria_leads")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids)
    .eq("funnel_id", funnelId)
    .is("deleted_at", null);

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "bulk_delete",
    entityType: "lead",
    entityId: funnelId,
  });

  const mentoriaId = await getMentoriaIdByFunnel(supabase, funnelId);
  if (mentoriaId) {
    await recalcMentoriaMetricsFromLeads(supabase, mentoriaId, options);
  }
}

export async function deleteAllLeadsByFunnel(
  supabase: SupabaseClient,
  funnelId: string,
  options: { actorId?: string | null } = {}
): Promise<void> {
  const { error } = await supabase
    .from("mentoria_leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("funnel_id", funnelId)
    .is("deleted_at", null);

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "delete_all",
    entityType: "lead",
    entityId: funnelId,
  });

  const mentoriaId = await getMentoriaIdByFunnel(supabase, funnelId);
  if (mentoriaId) {
    await recalcMentoriaMetricsFromLeads(supabase, mentoriaId, options);
  }
}

export async function bulkDeleteLeadsAcrossFunnels(
  supabase: SupabaseClient,
  mentoriaId: string,
  ids: string[],
  options: { actorId?: string | null } = {}
): Promise<void> {
  const { data: funnelRows } = await supabase
    .from("funnels")
    .select("id")
    .eq("mentoria_id", mentoriaId)
    .is("deleted_at", null)
    .returns<{ id: string }[]>();

  const funnelIds = (funnelRows ?? []).map((f) => f.id);
  if (funnelIds.length === 0) return;

  const { error } = await supabase
    .from("mentoria_leads")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids)
    .in("funnel_id", funnelIds)
    .is("deleted_at", null);

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "bulk_delete",
    entityType: "lead",
    entityId: mentoriaId,
  });

  await recalcMentoriaMetricsFromLeads(supabase, mentoriaId, options);
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

export async function recalcMentoriaMetricsFromLeads(
  supabase: SupabaseClient,
  mentoriaId: string,
  options: { actorId?: string | null } = {}
): Promise<void> {
  const baseline = await latestManualSnapshot(supabase, mentoriaId);

  const { data: stats } = await supabase
    .rpc("get_mentoria_lead_stats", { p_mentoria_id: mentoriaId })
    .maybeSingle<{
      total_leads: number;
      leads_grupo: number;
      leads_ao_vivo: number;
      agendamentos: number;
      vendas: number;
      valor_vendas: number;
      valor_entrada: number;
    }>();

  const snapshot = {
    mentoria_id: mentoriaId,
    total_leads: Number(stats?.total_leads ?? 0),
    leads_grupo: Number(stats?.leads_grupo ?? 0),
    leads_ao_vivo: Number(stats?.leads_ao_vivo ?? 0),
    agendamentos: Number(stats?.agendamentos ?? 0),
    calls_realizadas: baseline.calls_realizadas,
    vendas: Number(stats?.vendas ?? 0),
    valor_vendas: Number(stats?.valor_vendas ?? 0),
    valor_entrada: Number(stats?.valor_entrada ?? 0),
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

// PostgREST tem max-rows = 1000 por padrão e .limit() não sobrepõe.
// Paginamos em lotes com .range() até esgotar.
async function fetchAllLeadsForMatching(
  supabase: SupabaseClient,
  funnelIds: string[]
): Promise<LeadMatchRow[]> {
  const BATCH = 1000;
  const all: LeadMatchRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("mentoria_leads")
      .select("id, name, phone, instagram_handle")
      .in("funnel_id", funnelIds)
      .is("deleted_at", null)
      .range(offset, offset + BATCH - 1)
      .returns<LeadMatchRow[]>();
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < BATCH) break;
    offset += BATCH;
    if (offset > 100_000) break; // safety net
  }
  return all;
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

  const leads = await fetchAllLeadsForMatching(supabase, funnelIds);

  const byPhone = new Map<string, LeadMatchRow[]>();
  const byName = new Map<string, LeadMatchRow[]>();

  for (const lead of leads) {
    const phoneKey = phoneIndexKey(lead.phone);
    if (phoneKey) pushToIndex(byPhone, phoneKey, lead);
    const nameKey = normalizeName(lead.name);
    if (nameKey) pushToIndex(byName, nameKey, lead);
  }

  const matchedIds = new Set<string>();
  const notMatched: AttendanceEntry[] = [];

  for (const entry of entries) {
    const entryPhoneKey = phoneIndexKey(entry.phone);
    const entryNameKey = normalizeName(entry.name);
    const entryMatched = new Set<string>();

    if (entryPhoneKey) {
      for (const lead of byPhone.get(entryPhoneKey) ?? []) entryMatched.add(lead.id);
    }
    if (entryNameKey) {
      for (const lead of byName.get(entryNameKey) ?? []) entryMatched.add(lead.id);
    }

    if (entryMatched.size === 0) {
      notMatched.push(entry);
      continue;
    }
    entryMatched.forEach((id) => matchedIds.add(id));
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

  const leads = await fetchAllLeadsForMatching(supabase, funnelIds);

  const byPhone = new Map<string, LeadMatchRow[]>();
  const byName = new Map<string, LeadMatchRow[]>();

  for (const lead of leads) {
    const phoneKey = phoneIndexKey(lead.phone);
    if (phoneKey) pushToIndex(byPhone, phoneKey, lead);
    const nameKey = normalizeName(lead.name);
    if (nameKey) pushToIndex(byName, nameKey, lead);
  }

  const matchedIds = new Set<string>();
  const notMatched: AttendanceEntry[] = [];

  for (const entry of entries) {
    const entryPhoneKey = phoneIndexKey(entry.phone);
    const entryNameKey = normalizeName(entry.name);
    const entryMatched = new Set<string>();

    if (entryPhoneKey) {
      for (const lead of byPhone.get(entryPhoneKey) ?? []) entryMatched.add(lead.id);
    }
    if (entryNameKey) {
      for (const lead of byName.get(entryNameKey) ?? []) entryMatched.add(lead.id);
    }

    if (entryMatched.size === 0) {
      notMatched.push(entry);
      continue;
    }
    entryMatched.forEach((id) => matchedIds.add(id));
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

export async function aggregatesByFunnel(
  supabase: SupabaseClient,
  funnelIds: string[]
): Promise<Map<string, FunnelLeadAggregates>> {
  const map = new Map<string, FunnelLeadAggregates>();
  if (funnelIds.length === 0) return map;

  type AggRow = {
    funnel_id: string;
    leads_do_funil: number;
    no_grupo: number;
    confirmaram: number;
    ao_vivo: number;
    agendados: number;
    vendas: number;
    valor_em_venda: number;
    valor_de_entrada: number;
  };

  const { data, error } = await supabase.rpc("get_funnel_lead_aggregates", {
    funnel_ids: funnelIds,
  });

  if (error || !data) return map;

  const rows = data as AggRow[];

  for (const row of rows) {
    map.set(row.funnel_id, {
      leads_do_funil: Number(row.leads_do_funil),
      no_grupo: Number(row.no_grupo),
      confirmaram: Number(row.confirmaram),
      ao_vivo: Number(row.ao_vivo),
      agendados: Number(row.agendados),
      vendas: Number(row.vendas),
      valor_em_venda: Number(row.valor_em_venda),
      valor_de_entrada: Number(row.valor_de_entrada),
    });
  }

  return map;
}
