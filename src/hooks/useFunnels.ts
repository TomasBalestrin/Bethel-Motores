"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  FunnelCreateInput,
  FunnelSnapshotInput,
} from "@/lib/validators/funnel";
import type {
  FunnelTemplate,
  FunnelTemplateField,
  FunnelWithTemplate,
} from "@/types/funnel";

export const FUNNELS_QUERY_KEY = ["funnels"] as const;
export const FUNNEL_TEMPLATES_QUERY_KEY = ["funnel-templates"] as const;

export async function listFunnelsByMentoria(
  mentoriaId: string
): Promise<FunnelWithTemplate[]> {
  const response = await fetch(`/api/mentorias/${mentoriaId}/funnels`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === "string" ? body.error : "Erro ao carregar funis"
    );
  }
  const json = await response.json();
  return (json.data ?? []) as FunnelWithTemplate[];
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
