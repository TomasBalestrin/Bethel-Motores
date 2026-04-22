import type {
  MentoriaCreateInput,
  MentoriaStatus,
  MentoriaUpdateInput,
} from "@/lib/validators/mentoria";

export interface MentoriaSpecialist {
  id: string;
  name: string;
  slug: string | null;
}

export interface Mentoria {
  id: string;
  name: string;
  scheduled_at: string;
  specialist_id: string;
  traffic_budget: number | null;
  status: MentoriaStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentoriaFunnel {
  id: string;
  name: string;
  template_id: string | null;
  created_at: string;
}

export interface MentoriaDetail extends Mentoria {
  specialist: MentoriaSpecialist | null;
  funnels: MentoriaFunnel[];
}

export interface MentoriaWithMetrics {
  id: string;
  name: string;
  scheduled_at: string;
  status: MentoriaStatus;
  specialist: MentoriaSpecialist | null;
  funnels_count: number;
  total_leads: number;
  leads_grupo: number;
  leads_ao_vivo: number;
  agendamentos: number;
  calls_realizadas: number;
  vendas: number;
  valor_vendas: number;
  valor_entrada: number;
  investimento_trafego: number;
  investimento_api: number;
  last_metric_at: string | null;
  pct_comparecimento: number;
  pct_agendamento: number;
  pct_comparecimento_call: number;
  pct_conversao_call: number;
  sem_debriefing: boolean;
}

export interface MentoriaFilters {
  query?: string;
  status?: MentoriaStatus | "all";
  sort?: "recent" | "oldest" | "top_revenue";
}

export type MentoriaInput = MentoriaCreateInput;
export type MentoriaUpdate = MentoriaUpdateInput;
