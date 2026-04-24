import { z } from "zod";

export const postTypeSchema = z.enum(["impulsionar", "organico"]);
export type PostTypeInput = z.infer<typeof postTypeSchema>;

const optionalDateISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)")
  .nullable()
  .optional();

const optionalTextField = z.string().max(2000).nullable().optional();

export const postCreateSchema = z.object({
  code: z.string().trim().min(1).max(64),
  link: z.string().trim().url().max(2048),
  post_type: postTypeSchema,
  headline: optionalTextField,
  gancho: optionalTextField,
  assunto: optionalTextField,
  posted_at: optionalDateISO,
});
export type PostCreateInput = z.infer<typeof postCreateSchema>;

export const postMetricsSchema = z.object({
  investment: z.number().nonnegative(),
  followers_gained: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative().default(0),
  reach: z.number().int().nonnegative(),
  impressions: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
  // Campos de impulsionar (0-1 como fração)
  hook_rate_3s: z.number().min(0).max(1).nullable().optional(),
  hold_50: z.number().min(0).max(1).nullable().optional(),
  hold_75: z.number().min(0).max(1).nullable().optional(),
  // Duração em segundos
  duration_seconds: z.number().int().nonnegative().nullable().optional(),
});
export type PostMetricsInput = z.infer<typeof postMetricsSchema>;

export const postAnalysisSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("file"),
    file_url: z.string().url().max(2048),
    file_name: z.string().trim().min(1).max(200),
  }),
  z.object({
    source: z.literal("link"),
    link: z.string().url().max(2048),
    note: z.string().max(2000).optional(),
  }),
  z.object({
    source: z.literal("text"),
    content_text: z.string().min(1).max(50_000),
  }),
]);
export type PostAnalysisInput = z.infer<typeof postAnalysisSchema>;

export const postPatchSchema = z.object({
  is_fit: z.boolean().optional(),
  is_test: z.boolean().optional(),
  is_active: z.boolean().optional(),
  post_type: postTypeSchema.optional(),
  headline: optionalTextField,
  gancho: optionalTextField,
  assunto: optionalTextField,
  posted_at: optionalDateISO,
});
export type PostPatchInput = z.infer<typeof postPatchSchema>;

export const meetingCreateSchema = z.object({
  meeting_type: z.enum(["terca", "sexta"]),
  meeting_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)"),
  pause_post: z.boolean(),
  metrics: postMetricsSchema,
});
export type MeetingCreateInput = z.infer<typeof meetingCreateSchema>;

const meetingImportRowSchema = z.object({
  link: z.string().url().max(2048),
  shortcode: z.string().nullable(),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meeting_type: z.enum(["terca", "sexta"]),
  post_type: postTypeSchema,
  posted_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  investment: z.number().nullable(),
  followers_gained: z.number().nullable(),
  hook_rate_3s: z.number().nullable(),
  hold_50: z.number().nullable(),
  hold_75: z.number().nullable(),
  duration_seconds: z.number().int().nullable(),
  reach: z.number().nullable(),
  likes: z.number().nullable(),
  comments: z.number().nullable(),
  shares: z.number().nullable(),
  gancho: z.string().max(2000).nullable(),
  headline: z.string().max(2000).nullable(),
  assunto: z.string().max(2000).nullable(),
  pause_post: z.boolean(),
  is_placeholder: z.boolean(),
});

export const meetingBulkImportSchema = z.object({
  rows: z.array(meetingImportRowSchema).min(1).max(1000),
});
export type MeetingBulkImportInput = z.infer<typeof meetingBulkImportSchema>;
export type MeetingImportRow = z.infer<typeof meetingImportRowSchema>;
