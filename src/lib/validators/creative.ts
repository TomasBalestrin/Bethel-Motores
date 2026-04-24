import { z } from "zod";

export const creativeFormatSchema = z.enum(["video", "static"]);
export type CreativeFormatInput = z.infer<typeof creativeFormatSchema>;

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const notesText = z
  .string()
  .trim()
  .max(5000)
  .nullable()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const nonNegativeInt = z.number().int().nonnegative().optional();
const percentFraction = z.number().min(0).max(1).nullable().optional();

export const creativeCreateSchema = z.object({
  code: z.string().trim().min(1, "Código obrigatório").max(64),
  format: creativeFormatSchema,
  headline: optionalText,
  link: z.string().trim().url().max(2048).nullable().optional(),
  leads: nonNegativeInt,
  qualified_leads: nonNegativeInt,
  impressions: nonNegativeInt,
  reach: nonNegativeInt,
  clicks: nonNegativeInt,
  hook_rate_3s: percentFraction,
  hold_50: percentFraction,
  hold_75: percentFraction,
  duration_seconds: z.number().int().nonnegative().nullable().optional(),
  notes: notesText,
});
export type CreativeCreateInput = z.infer<typeof creativeCreateSchema>;

export const creativeUpdateSchema = z.object({
  code: z.string().trim().min(1).max(64).optional(),
  format: creativeFormatSchema.optional(),
  headline: optionalText,
  link: z.string().trim().url().max(2048).nullable().optional(),
  is_active: z.boolean().optional(),
  leads: nonNegativeInt,
  qualified_leads: nonNegativeInt,
  impressions: nonNegativeInt,
  reach: nonNegativeInt,
  clicks: nonNegativeInt,
  hook_rate_3s: percentFraction,
  hold_50: percentFraction,
  hold_75: percentFraction,
  duration_seconds: z.number().int().nonnegative().nullable().optional(),
  notes: notesText,
});
export type CreativeUpdateInput = z.infer<typeof creativeUpdateSchema>;
