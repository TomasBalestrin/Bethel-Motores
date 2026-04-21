import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task";

export const taskCreateSchema = z.object({
  social_profile_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable(),
  priority: z.enum(TASK_PRIORITIES),
  assignee_id: z.string().uuid().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  status: z.enum(TASK_STATUSES),
});
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

export const taskPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  position: z.number().optional(),
});
export type TaskPatchInput = z.infer<typeof taskPatchSchema>;

export const taskCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
export type TaskCommentInput = z.infer<typeof taskCommentSchema>;
