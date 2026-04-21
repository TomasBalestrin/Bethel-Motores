import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  getMentoriaWithMetricsById,
  listMentorias,
} from "@/services/mentorias.service";
import type {
  MentoriaFilters,
  MentoriaWithMetrics,
} from "@/types/mentoria";

export const cachedListMentorias = cache(
  async (filters: MentoriaFilters): Promise<MentoriaWithMetrics[]> => {
    const supabase = await createClient();
    return listMentorias(supabase, filters);
  }
);

export const cachedGetMentoriaWithMetrics = cache(
  async (mentoriaId: string): Promise<MentoriaWithMetrics | null> => {
    const supabase = await createClient();
    return getMentoriaWithMetricsById(supabase, mentoriaId);
  }
);
