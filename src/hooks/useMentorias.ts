"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  createMentoria,
  listMentorias,
} from "@/services/mentorias.service";
import type {
  MentoriaCreateInput,
  MentoriaUpdateInput,
} from "@/lib/validators/mentoria";
import type {
  MentoriaFilters,
  MentoriaWithMetrics,
} from "@/types/mentoria";

export const MENTORIAS_QUERY_KEY = ["mentorias"] as const;

export function useMentorias(
  filters: MentoriaFilters,
  initialData?: MentoriaWithMetrics[]
) {
  return useQuery({
    queryKey: [...MENTORIAS_QUERY_KEY, filters],
    queryFn: () => listMentorias(createClient(), filters),
    initialData,
    staleTime: 15_000,
  });
}

export function useCreateMentoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MentoriaCreateInput) =>
      createMentoria(createClient(), input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MENTORIAS_QUERY_KEY });
    },
  });
}

export function useUpdateMentoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: MentoriaUpdateInput;
    }) => {
      const response = await fetch(`/api/mentorias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body?.error === "string" ? body.error : "Erro ao atualizar"
        );
      }
      return (await response.json()) as { data: { id: string } };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MENTORIAS_QUERY_KEY });
    },
  });
}
