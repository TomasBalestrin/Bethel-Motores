import { z } from "zod";

export const postCreateSchema = z.object({
  code: z.string().trim().min(1).max(64),
  link: z.string().trim().url().max(2048),
  budget: z
    .union([z.number().nonnegative(), z.null()])
    .optional()
    .nullable(),
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
});
export type PostPatchInput = z.infer<typeof postPatchSchema>;
