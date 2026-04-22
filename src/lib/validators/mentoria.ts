import { z } from "zod";

export const MENTORIA_STATUSES = ["em_andamento", "concluida"] as const;
export type MentoriaStatus = (typeof MENTORIA_STATUSES)[number];

export const mentoriaCreateSchema = z.object({
  name: z.string().trim().min(3, "Mínimo 3 caracteres").max(120),
  scheduled_at: z
    .string()
    .min(1, "Informe data e horário")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Data inválida",
    }),
  specialist_id: z.string().uuid("Selecione um especialista"),
  traffic_budget: z
    .union([z.number().nonnegative(), z.null()])
    .optional()
    .nullable(),
});
export type MentoriaCreateInput = z.infer<typeof mentoriaCreateSchema>;

export const mentoriaUpdateSchema = mentoriaCreateSchema.partial().extend({
  status: z.enum(MENTORIA_STATUSES).optional(),
});
export type MentoriaUpdateInput = z.infer<typeof mentoriaUpdateSchema>;

export const mentoriaMetricsSchema = z.object({
  leads_grupo: z.number().int().nonnegative().default(0),
  leads_ao_vivo: z.number().int().nonnegative().default(0),
  agendamentos: z.number().int().nonnegative().default(0),
  calls_realizadas: z.number().int().nonnegative().default(0),
  vendas: z.number().int().nonnegative().default(0),
  valor_vendas: z.number().nonnegative().default(0),
  valor_entrada: z.number().nonnegative().default(0),
  investimento_trafego: z.number().nonnegative().default(0),
  investimento_api: z.number().nonnegative().default(0),
});
export type MentoriaMetricsInput = z.infer<typeof mentoriaMetricsSchema>;

export const MENTORIA_SORT_OPTIONS = [
  "recent",
  "oldest",
  "top_revenue",
] as const;
export type MentoriaSort = (typeof MENTORIA_SORT_OPTIONS)[number];

const optionalLabel = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .nullable();

export const disparoManualSchema = z.object({
  received_at: z
    .string()
    .min(1, "Informe data e horário")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Data inválida",
    }),
  funnel_label: optionalLabel,
  campaign_name: optionalLabel,
  template_name: optionalLabel,
  responsible_name: optionalLabel,
  volume_sent: z.coerce.number().int().nonnegative(),
  volume_delivered: z.coerce.number().int().nonnegative(),
  volume_read: z.coerce.number().int().nonnegative().optional().default(0),
  volume_replied: z.coerce.number().int().nonnegative().optional().default(0),
  volume_failed: z.coerce.number().int().nonnegative().optional().default(0),
  cost: z.coerce.number().nonnegative(),
});
export type DisparoManualInput = z.infer<typeof disparoManualSchema>;
