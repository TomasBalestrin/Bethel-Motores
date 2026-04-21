import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function listFunnelsByMentoria(
  supabase: SupabaseClient,
  mentoriaId: string
): Promise<FunnelWithTemplate[]> {
  const { data, error } = await supabase
    .from("funnels")
    .select(FUNNEL_SELECT)
    .eq("mentoria_id", mentoriaId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .returns<FunnelRow[]>();

  if (error) throw error;
  const rows = data ?? [];
  const valuesByFunnel = await fetchCurrentValues(
    supabase,
    rows.map((row) => row.id)
  );

  return rows.map((row) => rowToFunnel(row, valuesByFunnel.get(row.id) ?? []));
}

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

  const valuesByFunnel = await fetchCurrentValues(supabase, [data.id]);
  return rowToFunnel(data, valuesByFunnel.get(data.id) ?? []);
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
