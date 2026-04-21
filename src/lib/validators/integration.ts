import { z } from "zod";

export const INTEGRATION_TYPES = ["fluxon", "meta_ads", "generic"] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const TARGET_TABLES = [
  "mentoria_metrics",
  "funnel_metric_snapshots",
] as const;
export type MappingTargetTable = (typeof TARGET_TABLES)[number];

export const mappingFieldSchema = z.object({
  source_path: z.string().trim().min(1).max(200),
  target_field: z.string().trim().min(1).max(64),
  target_table: z.enum(TARGET_TABLES),
  funnel_field_key: z.string().trim().min(1).max(64).optional(),
});

export const mappingSchema = z.object({
  fields: z.array(mappingFieldSchema).min(1),
  mentoria_id_path: z.string().trim().min(1).max(200).optional(),
  funnel_id_path: z.string().trim().min(1).max(200).optional(),
  event_id_path: z.string().trim().min(1).max(200).optional(),
});
export type IntegrationMapping = z.infer<typeof mappingSchema>;

export const integrationSourceCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/i, "Use a-z, 0-9 e -"),
  name: z.string().trim().min(2).max(120),
  type: z.enum(INTEGRATION_TYPES),
  mapping: mappingSchema,
  config: z.record(z.string(), z.unknown()).optional(),
});
export type IntegrationSourceCreateInput = z.infer<
  typeof integrationSourceCreateSchema
>;

export const integrationSourceUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  type: z.enum(INTEGRATION_TYPES).optional(),
  mapping: mappingSchema.optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});
export type IntegrationSourceUpdateInput = z.infer<
  typeof integrationSourceUpdateSchema
>;
