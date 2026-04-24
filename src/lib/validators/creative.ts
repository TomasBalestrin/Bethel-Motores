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

export const creativeCreateSchema = z.object({
  code: z.string().trim().min(1, "Código obrigatório").max(64),
  format: creativeFormatSchema,
  headline: optionalText,
  link: z.string().trim().url().max(2048).nullable().optional(),
});
export type CreativeCreateInput = z.infer<typeof creativeCreateSchema>;

export const creativeUpdateSchema = z.object({
  code: z.string().trim().min(1).max(64).optional(),
  format: creativeFormatSchema.optional(),
  headline: optionalText,
  link: z.string().trim().url().max(2048).nullable().optional(),
  is_active: z.boolean().optional(),
});
export type CreativeUpdateInput = z.infer<typeof creativeUpdateSchema>;
