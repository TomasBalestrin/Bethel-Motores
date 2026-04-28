"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { FUNNELS_QUERY_KEY } from "@/hooks/useFunnels";
import { MENTORIAS_QUERY_KEY } from "@/hooks/useMentorias";

// Toda mutação que mexe em mentoria_leads precisa invalidar:
//   - ["leads", funnelId] / ["leads-mentoria", mentoriaId] — a tabela em si
//   - ["funnels", mentoriaId] — funnel cards (aggregatesByFunnel + mergeDerivedValues)
//   - ["mentorias"] — listagem global e dashboard motor (live stats por mentoria)
//
// router.refresh() cobre Server Components (MentoriaMetricsGrid, header, etc.),
// mas NÃO cobre React Query — as queries acima ficavam stale até o staleTime
// (15s), causando o bug do dashboard não atualizar com mudanças nas tags.
export function useInvalidateMentoriaData(mentoriaId: string) {
  const qc = useQueryClient();

  return useCallback(() => {
    void qc.invalidateQueries({
      queryKey: [...FUNNELS_QUERY_KEY, mentoriaId],
    });
    void qc.invalidateQueries({ queryKey: ["leads"] });
    void qc.invalidateQueries({
      queryKey: ["leads-mentoria", mentoriaId],
    });
    void qc.invalidateQueries({ queryKey: MENTORIAS_QUERY_KEY });
  }, [qc, mentoriaId]);
}
