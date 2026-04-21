"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  FunnelCreateInput,
  FunnelSnapshotInput,
} from "@/lib/validators/funnel";
import type {
  Funnel,
  FunnelFieldValue,
  FunnelTemplate,
  FunnelTemplateField,
  FunnelWithTemplate,
} from "@/types/funnel";

export const FUNNELS_QUERY_KEY = ["funnels"] as const;
export const FUNNEL_TEMPLATES_QUERY_KEY = ["funnel-templates"] as const;

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
  source: FunnelFieldValue["source"];
  captured_at: string;
}

export async function listFunnelsByMentoria(
  mentoriaId: string
): Promise<FunnelWithTemplate[]> {
  const supabase = createClient();

  const funnelsResult = await supabase
    .from("funnels")
    .select(
      `
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
      `
    )
    .eq("mentoria_id", mentoriaId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .returns<FunnelRow[]>();

  if (funnelsResult.error) throw funnelsResult.error;
  const rows = funnelsResult.data ?? [];

  const ids = rows.map((row) => row.id);
  let valuesByFunnel = new Map<string, FunnelFieldValue[]>();

  if (ids.length > 0) {
    const valuesResult = await supabase
      .from("v_funnels_current_values")
      .select("funnel_id, field_key, value_numeric, value_text, source, captured_at")
      .in("funnel_id", ids)
      .returns<CurrentValueRow[]>();

    if (!valuesResult.error && valuesResult.data) {
      valuesByFunnel = valuesResult.data.reduce((map, row) => {
        const arr = map.get(row.funnel_id) ?? [];
        arr.push({
          field_key: row.field_key,
          value_numeric: row.value_numeric,
          value_text: row.value_text,
          source: row.source,
          captured_at: row.captured_at,
        });
        map.set(row.funnel_id, arr);
        return map;
      }, new Map<string, FunnelFieldValue[]>());
    }
  }

  return rows.map((row) => {
    const template = row.template
      ? {
          id: row.template.id,
          name: row.template.name,
          description: row.template.description,
          is_default: row.template.is_default,
          fields: [...(row.template.fields ?? [])].sort(
            (a, b) => a.display_order - b.display_order
          ),
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
      values: valuesByFunnel.get(row.id) ?? [],
    };
  });
}

export async function listFunnelTemplates(): Promise<FunnelTemplate[]> {
  const supabase = createClient();
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
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .returns<
      (Omit<FunnelTemplate, "fields"> & { fields: FunnelTemplateField[] | null })[]
    >();

  if (error) throw error;
  return (data ?? []).map((template) => ({
    ...template,
    fields: [...(template.fields ?? [])].sort(
      (a, b) => a.display_order - b.display_order
    ),
  }));
}

export function useFunnels(mentoriaId: string) {
  return useQuery({
    queryKey: [...FUNNELS_QUERY_KEY, mentoriaId],
    queryFn: () => listFunnelsByMentoria(mentoriaId),
    enabled: Boolean(mentoriaId),
    staleTime: 15_000,
  });
}

export function useFunnelTemplates() {
  return useQuery({
    queryKey: FUNNEL_TEMPLATES_QUERY_KEY,
    queryFn: listFunnelTemplates,
    staleTime: 60_000,
  });
}

export function useCreateFunnel(mentoriaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FunnelCreateInput) => {
      const response = await fetch(`/api/mentorias/${mentoriaId}/funnels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao criar funil");
      }
      return (await response.json()) as { data: { id: string } };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...FUNNELS_QUERY_KEY, mentoriaId] });
    },
  });
}

export function useSaveFunnelSnapshot(mentoriaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      funnelId,
      input,
    }: {
      funnelId: string;
      input: FunnelSnapshotInput;
    }) => {
      const response = await fetch(`/api/funnels/${funnelId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Erro ao salvar snapshot");
      }
      return (await response.json()) as { data: { saved: number } };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...FUNNELS_QUERY_KEY, mentoriaId] });
    },
  });
}
