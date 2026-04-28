import { z } from "zod";

export const MENTORIA_STATUSES = ["em_andamento", "concluida"] as const;
export type MentoriaStatus = (typeof MENTORIA_STATUSES)[number];

// Janela aceita pra scheduled_at: 10 anos pra trás, 5 anos pra frente.
// Bloqueia digitação errada (ex: 2202 em vez de 2022) que escaparia da
// validação genérica de data.
const SCHEDULED_AT_PAST_YEARS = 10;
const SCHEDULED_AT_FUTURE_YEARS = 5;

export const mentoriaCreateSchema = z.object({
  name: z.string().trim().min(3, "Mínimo 3 caracteres").max(120),
  scheduled_at: z
    .string()
    .min(1, "Informe data e horário")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Data inválida",
    })
    .refine(
      (value) => {
        const t = new Date(value).getTime();
        const now = Date.now();
        const earliest = now - SCHEDULED_AT_PAST_YEARS * 365 * 86400 * 1000;
        const latest = now + SCHEDULED_AT_FUTURE_YEARS * 365 * 86400 * 1000;
        return t >= earliest && t <= latest;
      },
      {
        message: `Data fora do intervalo aceito (-${SCHEDULED_AT_PAST_YEARS}a / +${SCHEDULED_AT_FUTURE_YEARS}a)`,
      }
    ),
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

export const trafegoPlatformSchema = z.enum([
  "meta_ads",
  "google_ads",
  "tiktok",
  "youtube",
  "outro",
]);
export type TrafegoPlatform = z.infer<typeof trafegoPlatformSchema>;

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
