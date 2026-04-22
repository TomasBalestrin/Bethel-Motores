"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeadsPage } from "@/types/lead";

interface UseLeadsByMentoriaParams {
  mentoriaId: string;
  page: number;
  pageSize?: number;
  query?: string;
}

export function mentoriaLeadsQueryKey(params: UseLeadsByMentoriaParams) {
  return [
    "leads-mentoria",
    params.mentoriaId,
    params.page,
    params.pageSize ?? 100,
    params.query ?? "",
  ] as const;
}

export function useLeadsByMentoria(params: UseLeadsByMentoriaParams) {
  return useQuery<LeadsPage>({
    queryKey: mentoriaLeadsQueryKey(params),
    queryFn: async () => {
      const url = new URL(
        `/api/mentorias/${params.mentoriaId}/leads`,
        window.location.origin
      );
      url.searchParams.set("page", String(params.page));
      url.searchParams.set("page_size", String(params.pageSize ?? 100));
      if (params.query && params.query.trim().length > 0) {
        url.searchParams.set("q", params.query.trim());
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string" ? data.error : "Erro ao carregar leads"
        );
      }
      const json = await res.json();
      return json.data as LeadsPage;
    },
    placeholderData: (prev) => prev,
    staleTime: 10_000,
  });
}

export function useInvalidateMentoriaLeads() {
  const qc = useQueryClient();
  return (mentoriaId?: string) =>
    qc.invalidateQueries({
      queryKey: mentoriaId ? ["leads-mentoria", mentoriaId] : ["leads-mentoria"],
    });
}
