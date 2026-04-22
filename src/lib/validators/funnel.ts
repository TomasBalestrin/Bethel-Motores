import { z } from "zod";

export const FIELD_TYPES = [
  "number",
  "currency",
  "percentage",
  "url",
  "text",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const METRIC_SOURCES = ["manual", "webhook", "api", "derived"] as const;
export type MetricSource = (typeof METRIC_SOURCES)[number];

export const funnelCreateSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  template_id: z.string().uuid("Selecione um template"),
  list_url: z
    .union([z.string().trim().url("URL inválida").max(2048), z.literal(""), z.null()])
    .nullable(),
  is_traffic_funnel: z.boolean(),
});
export type FunnelCreateInput = z.infer<typeof funnelCreateSchema>;

const snapshotValue = z.union([z.number(), z.string(), z.null()]);

export const funnelSnapshotSchema = z.object({
  values: z.record(z.string().min(1), snapshotValue),
});
export type FunnelSnapshotInput = z.infer<typeof funnelSnapshotSchema>;
