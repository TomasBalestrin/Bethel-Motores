import { z } from "zod";

const optionalTrimmed = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .nullable();

const optionalNumeric = z
  .union([z.number(), z.null()])
  .optional()
  .nullable();

export const leadCreateSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  phone: optionalTrimmed,
  instagram_handle: optionalTrimmed,
  revenue: optionalNumeric,
  niche: optionalTrimmed,
  joined_group: z.boolean().optional().default(false),
  confirmed_presence: z.boolean().optional().default(false),
  attended: z.boolean().optional().default(false),
  scheduled: z.boolean().optional().default(false),
  sold: z.boolean().optional().default(false),
  sale_value: optionalNumeric,
  entry_value: optionalNumeric,
});
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

export const leadUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: optionalTrimmed,
  instagram_handle: optionalTrimmed,
  revenue: optionalNumeric,
  niche: optionalTrimmed,
  joined_group: z.boolean().optional(),
  confirmed_presence: z.boolean().optional(),
  attended: z.boolean().optional(),
  scheduled: z.boolean().optional(),
  sold: z.boolean().optional(),
  sale_value: optionalNumeric,
  entry_value: optionalNumeric,
});
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

export const leadBulkSchema = z.object({
  leads: z.array(leadCreateSchema).min(1).max(5000),
});
export type LeadBulkInput = z.infer<typeof leadBulkSchema>;

const attendanceEntrySchema = z
  .object({
    name: z.string().trim().max(200).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    instagram_handle: z.string().trim().max(80).nullable().optional(),
  })
  .refine(
    (value) =>
      Boolean(
        (value.name && value.name.length > 0) ||
          (value.phone && value.phone.length > 0) ||
          (value.instagram_handle && value.instagram_handle.length > 0)
      ),
    { message: "Linha sem nome, telefone ou @" }
  );

export const attendanceBulkSchema = z.object({
  entries: z.array(attendanceEntrySchema).min(1).max(10_000),
});
export type AttendanceBulkInput = z.infer<typeof attendanceBulkSchema>;
