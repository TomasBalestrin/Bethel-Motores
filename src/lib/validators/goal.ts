import { z } from "zod";

export const GOAL_SCOPES = ["motor", "mentoria"] as const;
export type GoalScope = (typeof GOAL_SCOPES)[number];

export const GOAL_METRIC_KEYS = [
  "faturamento",
  "base",
  "investimento_trafego",
  "investimento_api",
  "vendas",
  "valor_vendas",
  "leads_grupo",
  "leads_ao_vivo",
  "agendamentos",
  "calls_realizadas",
] as const;
export type GoalMetricKey = (typeof GOAL_METRIC_KEYS)[number];

const CURRENT_YEAR = new Date().getUTCFullYear();

const baseGoal = {
  scope_type: z.enum(GOAL_SCOPES),
  motor_id: z.string().uuid().nullable().optional(),
  mentoria_id: z.string().uuid().nullable().optional(),
  metric_key: z.string().trim().min(1).max(64),
  target_value: z.number().nonnegative(),
  period_year: z
    .number()
    .int()
    .min(CURRENT_YEAR - 5)
    .max(CURRENT_YEAR + 5),
  period_month: z.number().int().min(1).max(12),
};

export const goalCreateSchema = z
  .object(baseGoal)
  .superRefine((value, ctx) => {
    if (value.scope_type === "motor") {
      if (!value.motor_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "motor_id obrigatório quando scope_type = motor",
          path: ["motor_id"],
        });
      }
      if (value.mentoria_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mentoria_id deve ser null quando scope_type = motor",
          path: ["mentoria_id"],
        });
      }
    }
    if (value.scope_type === "mentoria") {
      if (!value.mentoria_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mentoria_id obrigatório quando scope_type = mentoria",
          path: ["mentoria_id"],
        });
      }
      if (value.motor_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "motor_id deve ser null quando scope_type = mentoria",
          path: ["motor_id"],
        });
      }
    }
  });
export type GoalCreateInput = z.infer<typeof goalCreateSchema>;

export const goalUpdateSchema = z.object({
  target_value: z.number().nonnegative().optional(),
  metric_key: z.string().trim().min(1).max(64).optional(),
  period_year: z
    .number()
    .int()
    .min(CURRENT_YEAR - 5)
    .max(CURRENT_YEAR + 5)
    .optional(),
  period_month: z.number().int().min(1).max(12).optional(),
});
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
