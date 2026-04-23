import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import type {
  Funnel,
  FunnelCurrentValue,
  FunnelFieldHistoryEntry,
  FunnelTemplate,
  FunnelTemplateField,
  FunnelWithTemplate,
} from "@/types/funnel";
import type {
  FunnelCreateInput,
  FunnelSnapshotInput,
} from "@/lib/validators/funnel";
import { logAudit } from "@/services/audit.service";
import {
  aggregatesByFunnel,
  type FunnelLeadAggregates,
} from "@/services/leads.service";

const FUNNEL_SELECT = `
  id,
  name,
  mentoria_id,
  template_id,
  list_url,
  is_traffic_funnel,
  is_active,
  created_at,
  template:funnel_templates(
    id,
    name,
    description,
    is_default,
    fields:funnel_template_fields(
      id,
      field_key,
      label,
      field_type,
      unit,
      default_source,
      display_order,
      is_required,
      is_aggregable
    )
  )
` as const;

interface FunnelRow extends Funnel {
  template:
    | (Pick<FunnelTemplate, "id" | "name" | "description" | "is_default"> & {
        fields: FunnelTemplateField[] | null;
      })
    | null;
}

interface CurrentValueRow {
  funnel_id: string;
  field_key: string;
  value_numeric: number | null;
  value_text: string | null;
  source: FunnelCurrentValue["source"];
  captured_at: string;
}

function sortFields(fields: FunnelTemplateField[] | null): FunnelTemplateField[] {
  return [...(fields ?? [])].sort((a, b) => a.display_order - b.display_order);
}

function rowToFunnel(
  row: FunnelRow,
  values: FunnelCurrentValue[]
): FunnelWithTemplate {
  const template = row.template
    ? {
        id: row.template.id,
        name: row.template.name,
        description: row.template.description,
        is_default: row.template.is_default,
        fields: sortFields(row.template.fields ?? null),
      }
    : null;

  return {
    id: row.id,
    name: row.name,
    mentoria_id: row.mentoria_id,
    template_id: row.template_id,
    list_url: row.list_url,
    is_traffic_funnel: row.is_traffic_funnel,
    is_active: row.is_active,
    created_at: row.created_at,
    template,
    values,
  };
}

async function fetchCurrentValues(
  supabase: SupabaseClient,
  funnelIds: string[]
): Promise<Map<string, FunnelCurrentValue[]>> {
  const map = new Map<string, FunnelCurrentValue[]>();
  if (funnelIds.length === 0) return map;

  const { data, error } = await supabase
    .from("v_funnels_current_values")
    .select("funnel_id, field_key, value_numeric, value_text, source, captured_at")
    .in("funnel_id", funnelIds)
    .returns<CurrentValueRow[]>();

  if (error || !data) return map;

  for (const row of data) {
    const list = map.get(row.funnel_id) ?? [];
    list.push({
      field_key: row.field_key,
      value_numeric: row.value_numeric,
      value_text: row.value_text,
      source: row.source,
      captured_at: row.captured_at,
    });
    map.set(row.funnel_id, list);
  }
  return map;
}

function normalizeForDetect(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\-]+/g, " ");
}

type AggregateKey = keyof FunnelLeadAggregates;

function detectAggregateKey(
  fieldKey: string,
  fieldLabel: string
): AggregateKey | null {
  const haystack = `${normalizeForDetect(fieldKey)} ${normalizeForDetect(fieldLabel)}`;
  // Ordem importa: mais específico primeiro.
  if (haystack.includes("entrada")) return "valor_de_entrada";
  if (/valor.*venda|venda.*valor/.test(haystack)) return "valor_em_venda";
  if (haystack.includes("venda")) return "vendas";
  if (haystack.includes("grupo")) return "no_grupo";
  // Ao vivo / compareceu — vem antes de "presenca" pra cobrir "compareceu ao vivo"
  if (haystack.includes("vivo") || haystack.includes("comparece"))
    return "ao_vivo";
  // Confirmaram presença
  if (
    haystack.includes("confirma") ||
    haystack.includes("presenc") ||
    haystack.includes("presente")
  )
    return "confirmaram";
  if (haystack.includes("agendad") || haystack.includes("agendamento"))
    return "agendados";
  if (
    haystack.includes("lead") ||
    haystack.includes("inscrito") ||
    haystack.includes("funil")
  )
    return "leads_do_funil";
  return null;
}

function mergeDerivedValues(
  manualValues: FunnelCurrentValue[],
  agg: FunnelLeadAggregates | undefined,
  fields: FunnelTemplateField[]
): FunnelCurrentValue[] {
  const byKey = new Map<string, FunnelCurrentValue>();
  for (const value of manualValues) byKey.set(value.field_key, value);

  const now = new Date().toISOString();
  for (const field of fields) {
    const aggKey = detectAggregateKey(field.field_key, field.label);
    if (!aggKey) continue;

    const existing = byKey.get(field.field_key);
    // Manual vence o derivado SÓ quando tem valor real preenchido.
    // Se o valor manual é nulo (nunca foi preenchido), deixa o derivado
    // entrar.
    if (
      existing &&
      existing.source === "manual" &&
      existing.value_numeric != null
    )
      continue;

    const numeric = agg ? agg[aggKey] : 0;
    byKey.set(field.field_key, {
      field_key: field.field_key,
      value_numeric: numeric,
      value_text: null,
      source: "derived",
      captured_at: existing?.captured_at ?? now,
    });
  }

  return Array.from(byKey.values());
}

export const listFunnelsByMentoria = cache(async (
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<FunnelWithTemplate[]> => {
  const { data, error } = await supabase
    .from("funnels")
    .select(FUNNEL_SELECT)
    .eq("mentoria_id", mentoriaId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .returns<FunnelRow[]>();

  if (error) throw error;
  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const [valuesByFunnel, aggByFunnel] = await Promise.all([
    fetchCurrentValues(supabase, ids),
    aggregatesByFunnel(supabase, ids),
  ]);

  return rows.map((row) => {
    const fields = sortFields(row.template?.fields ?? null);
    const merged = mergeDerivedValues(
      valuesByFunnel.get(row.id) ?? [],
      aggByFunnel.get(row.id),
      fields
    );
    return rowToFunnel(row, merged);
  });
});

export async function getFunnelById(
  supabase: SupabaseClient,
  funnelId: string
): Promise<FunnelWithTemplate | null> {
  const { data, error } = await supabase
    .from("funnels")
    .select(FUNNEL_SELECT)
    .eq("id", funnelId)
    .is("deleted_at", null)
    .maybeSingle<FunnelRow>();

  if (error) throw error;
  if (!data) return null;

  const [valuesByFunnel, aggByFunnel] = await Promise.all([
    fetchCurrentValues(supabase, [data.id]),
    aggregatesByFunnel(supabase, [data.id]),
  ]);

  const fields = sortFields(data.template?.fields ?? null);
  const merged = mergeDerivedValues(
    valuesByFunnel.get(data.id) ?? [],
    aggByFunnel.get(data.id),
    fields
  );
  return rowToFunnel(data, merged);
}

export interface CreateFunnelOptions {
  actorId?: string;
}

export async function createFunnel(
  supabase: SupabaseClient,
  mentoriaId: string,
  input: FunnelCreateInput,
  options: CreateFunnelOptions = {}
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("funnels")
    .insert({
      mentoria_id: mentoriaId,
      template_id: input.template_id,
      name: input.name,
      list_url:
        input.list_url == null || input.list_url === ""
          ? null
          : input.list_url,
      is_traffic_funnel: Boolean(input.is_traffic_funnel),
      created_by: options.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}

export async function updateFunnel(
  supabase: SupabaseClient,
  funnelId: string,
  patch: Partial<{
    name: string;
    list_url: string | null;
    template_id: string;
    is_traffic_funnel: boolean;
    is_active: boolean;
  }>
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("funnels")
    .update(patch)
    .eq("id", funnelId)
    .is("deleted_at", null)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}

export interface SnapshotResult {
  saved: number;
  skipped: string[];
}

export async function insertFunnelSnapshot(
  supabase: SupabaseClient,
  funnelId: string,
  input: FunnelSnapshotInput,
  options: { actorId?: string } = {}
): Promise<SnapshotResult> {
  const { data: template, error: templateError } = await supabase
    .from("funnels")
    .select(
      `template:funnel_templates(
        fields:funnel_template_fields(field_key, field_type, default_source)
      )`
    )
    .eq("id", funnelId)
    .is("deleted_at", null)
    .maybeSingle<{
      template: {
        fields: {
          field_key: string;
          field_type: string;
          default_source: "manual" | "webhook" | "api";
        }[] | null;
      } | null;
    }>();

  if (templateError) throw templateError;
  if (!template?.template?.fields) {
    throw new Error("Funil ou template não encontrado");
  }

  const fieldMap = new Map(
    template.template.fields.map((field) => [field.field_key, field])
  );

  const skipped: string[] = [];
  const rows: {
    funnel_id: string;
    field_key: string;
    value_numeric: number | null;
    value_text: string | null;
    source: "manual";
    captured_by: string | null;
  }[] = [];

  for (const [fieldKey, rawValue] of Object.entries(input.values)) {
    const field = fieldMap.get(fieldKey);
    if (!field) {
      skipped.push(fieldKey);
      continue;
    }
    if (field.default_source !== "manual") {
      skipped.push(fieldKey);
      continue;
    }

    let value_numeric: number | null = null;
    let value_text: string | null = null;

    if (field.field_type === "url" || field.field_type === "text") {
      value_text = rawValue == null ? null : String(rawValue);
    } else {
      if (rawValue == null || rawValue === "") {
        value_numeric = null;
      } else {
        const parsed =
          typeof rawValue === "number" ? rawValue : Number(rawValue);
        value_numeric = Number.isFinite(parsed) ? parsed : null;
      }
    }

    rows.push({
      funnel_id: funnelId,
      field_key: fieldKey,
      value_numeric,
      value_text,
      source: "manual",
      captured_by: options.actorId ?? null,
    });
  }

  if (rows.length === 0) {
    return { saved: 0, skipped };
  }

  const { error } = await supabase.from("funnel_metric_snapshots").insert(rows);
  if (error) throw error;

  return { saved: rows.length, skipped };
}

export async function listFieldHistory(
  supabase: SupabaseClient,
  funnelId: string,
  fieldKey: string,
  limit = 100
): Promise<FunnelFieldHistoryEntry[]> {
  const { data, error } = await supabase
    .from("funnel_metric_snapshots")
    .select(
      "field_key, value_numeric, value_text, source, source_ref, captured_by, captured_at"
    )
    .eq("funnel_id", funnelId)
    .eq("field_key", fieldKey)
    .order("captured_at", { ascending: false })
    .limit(limit)
    .returns<FunnelFieldHistoryEntry[]>();

  if (error) throw error;
  return data ?? [];
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  fieldCount: number;
  funnelCount: number;
  updated_at: string;
}

export async function listTemplates(
  supabase: SupabaseClient
): Promise<TemplateSummary[]> {
  const { data, error } = await supabase
    .from("funnel_templates")
    .select(
      `
        id,
        name,
        description,
        is_default,
        updated_at,
        fields:funnel_template_fields(count),
        funnels(count)
      `
    )
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })
    .returns<
      {
        id: string;
        name: string;
        description: string | null;
        is_default: boolean;
        updated_at: string;
        fields: { count: number }[] | null;
        funnels: { count: number }[] | null;
      }[]
    >();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    is_default: row.is_default,
    updated_at: row.updated_at,
    fieldCount: row.fields?.[0]?.count ?? 0,
    funnelCount: row.funnels?.[0]?.count ?? 0,
  }));
}

export async function getTemplateById(
  supabase: SupabaseClient,
  id: string
): Promise<FunnelTemplate | null> {
  const { data, error } = await supabase
    .from("funnel_templates")
    .select(
      `
        id,
        name,
        description,
        is_default,
        fields:funnel_template_fields(
          id,
          field_key,
          label,
          field_type,
          unit,
          default_source,
          display_order,
          is_required,
          is_aggregable
        )
      `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<Omit<FunnelTemplate, "fields"> & {
      fields: FunnelTemplateField[] | null;
    }>();

  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    fields: sortFields(data.fields ?? null),
  };
}

export interface TemplateCreateInput {
  name: string;
  description?: string | null;
  is_default?: boolean;
}

export async function createTemplate(
  supabase: SupabaseClient,
  input: TemplateCreateInput,
  options: { actorId?: string } = {}
): Promise<{ id: string }> {
  const row = {
    name: input.name,
    description: input.description ?? null,
    is_default: input.is_default ?? false,
    created_by: options.actorId ?? null,
  };

  const { data, error } = await supabase
    .from("funnel_templates")
    .insert(row)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "create",
    entityType: "funnel_template",
    entityId: data.id,
    changes: { after: row },
  });

  return data;
}

export interface TemplateUpdateInput {
  name?: string;
  description?: string | null;
  is_default?: boolean;
}

export async function updateTemplate(
  supabase: SupabaseClient,
  id: string,
  patch: TemplateUpdateInput,
  options: { actorId?: string | null } = {}
): Promise<{ id: string }> {
  const { data: before } = await supabase
    .from("funnel_templates")
    .select("name, description, is_default")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("funnel_templates")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "funnel_template",
    entityId: id,
    changes: {
      before: before ? (before as Record<string, unknown>) : null,
      after: patch as Record<string, unknown>,
    },
  });

  return data;
}

export interface FieldInput {
  field_key: string;
  label: string;
  field_type: FunnelTemplateField["field_type"];
  unit?: string | null;
  default_source: FunnelTemplateField["default_source"];
  display_order?: number;
  is_required?: boolean;
  is_aggregable?: boolean;
}

export async function addField(
  supabase: SupabaseClient,
  templateId: string,
  input: FieldInput,
  options: { actorId?: string | null } = {}
): Promise<{ id: string }> {
  const row = {
    template_id: templateId,
    field_key: input.field_key,
    label: input.label,
    field_type: input.field_type,
    unit: input.unit ?? null,
    default_source: input.default_source,
    display_order: input.display_order ?? 0,
    is_required: input.is_required ?? false,
    is_aggregable: input.is_aggregable ?? true,
  };

  const { data, error } = await supabase
    .from("funnel_template_fields")
    .insert(row)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "create",
    entityType: "funnel_template_field",
    entityId: data.id,
    changes: { after: row, meta: { template_id: templateId } },
  });

  return data;
}

export interface FieldUpdateInput {
  label?: string;
  field_type?: FunnelTemplateField["field_type"];
  unit?: string | null;
  default_source?: FunnelTemplateField["default_source"];
  display_order?: number;
  is_required?: boolean;
  is_aggregable?: boolean;
}

export async function updateField(
  supabase: SupabaseClient,
  fieldId: string,
  patch: FieldUpdateInput,
  options: { actorId?: string | null } = {}
): Promise<{ id: string }> {
  const { data: before } = await supabase
    .from("funnel_template_fields")
    .select(
      "label, field_type, unit, default_source, display_order, is_required, is_aggregable"
    )
    .eq("id", fieldId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("funnel_template_fields")
    .update(patch)
    .eq("id", fieldId)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "update",
    entityType: "funnel_template_field",
    entityId: fieldId,
    changes: {
      before: before ? (before as Record<string, unknown>) : null,
      after: patch as Record<string, unknown>,
    },
  });

  return data;
}

export async function countFieldSnapshots(
  supabase: SupabaseClient,
  templateId: string,
  fieldKey: string
): Promise<number> {
  const { data, error } = await supabase
    .from("funnels")
    .select("id")
    .eq("template_id", templateId)
    .returns<{ id: string }[]>();

  if (error) return 0;
  const funnelIds = (data ?? []).map((row) => row.id);
  if (funnelIds.length === 0) return 0;

  const { count } = await supabase
    .from("funnel_metric_snapshots")
    .select("id", { count: "exact", head: true })
    .in("funnel_id", funnelIds)
    .eq("field_key", fieldKey);

  return count ?? 0;
}

export async function deleteField(
  supabase: SupabaseClient,
  fieldId: string,
  options: { actorId?: string | null } = {}
): Promise<void> {
  const { data: before } = await supabase
    .from("funnel_template_fields")
    .select(
      "template_id, field_key, label, field_type, unit, default_source, display_order, is_required, is_aggregable"
    )
    .eq("id", fieldId)
    .maybeSingle();

  const { error } = await supabase
    .from("funnel_template_fields")
    .delete()
    .eq("id", fieldId);
  if (error) throw error;

  await logAudit(supabase, {
    userId: options.actorId ?? null,
    action: "delete",
    entityType: "funnel_template_field",
    entityId: fieldId,
    changes: {
      before: before ? (before as Record<string, unknown>) : null,
      after: null,
    },
  });
}

export async function reorderFields(
  supabase: SupabaseClient,
  items: { id: string; display_order: number }[]
): Promise<void> {
  await Promise.all(
    items.map((item) =>
      supabase
        .from("funnel_template_fields")
        .update({ display_order: item.display_order })
        .eq("id", item.id)
    )
  );
}
