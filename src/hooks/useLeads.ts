"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeadsPage } from "@/types/lead";

interface UseLeadsParams {
  funnelId: string;
  page: number;
  pageSize?: number;
  query?: string;
}

export function leadsQueryKey(params: UseLeadsParams) {
  return ["leads", params.funnelId, params.page, params.pageSize ?? 100, params.query ?? ""] as const;
}

export function useLeads(params: UseLeadsParams) {
  return useQuery<LeadsPage>({
    queryKey: leadsQueryKey(params),
    queryFn: async () => {
      const url = new URL(`/api/funnels/${params.funnelId}/leads`, window.location.origin);
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

export function useInvalidateLeads() {
  const qc = useQueryClient();
  return (funnelId?: string) =>
    qc.invalidateQueries({
      queryKey: funnelId ? ["leads", funnelId] : ["leads"],
    });
}
