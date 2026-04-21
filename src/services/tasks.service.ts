import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  TaskCommentInput,
  TaskCreateInput,
  TaskPatchInput,
} from "@/lib/validators/task";
import type { Task, TaskComment, TaskWithComments } from "@/types/task";

const TASK_SELECT = `
  id,
  social_profile_id,
  title,
  description,
  status,
  priority,
  position,
  assignee_id,
  due_date,
  created_by,
  created_at,
  updated_at,
  assignee:user_profiles!tasks_assignee_id_fkey(id, name, email, avatar_url)
` as const;

interface TaskRow extends Omit<Task, "assignee"> {
  assignee: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    ...row,
    assignee: row.assignee ?? null,
  };
}

export async function listTasksByProfile(
  supabase: SupabaseClient,
  profileId: string
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("social_profile_id", profileId)
    .is("deleted_at", null)
    .order("status", { ascending: true })
    .order("position", { ascending: true })
    .returns<TaskRow[]>();

  if (error) throw error;
  return (data ?? []).map(rowToTask);
}

export async function getTaskWithComments(
  supabase: SupabaseClient,
  taskId: string
): Promise<TaskWithComments | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", taskId)
    .is("deleted_at", null)
    .maybeSingle<TaskRow>();

  if (error) throw error;
  if (!data) return null;

  const commentsResult = await supabase
    .from("task_comments")
    .select(
      `
        id,
        task_id,
        user_id,
        content,
        created_at,
        user:user_profiles!task_comments_user_id_fkey(name)
      `
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
    .returns<
      (Omit<TaskComment, "user_name"> & {
        user: { name: string | null } | null;
      })[]
    >();

  const comments: TaskComment[] = (commentsResult.data ?? []).map((row) => ({
    id: row.id,
    task_id: row.task_id,
    user_id: row.user_id,
    user_name: row.user?.name ?? null,
    content: row.content,
    created_at: row.created_at,
  }));

  return { ...rowToTask(data), comments };
}

export interface CreateTaskOptions {
  actorId?: string;
}

export async function createTask(
  supabase: SupabaseClient,
  input: TaskCreateInput,
  options: CreateTaskOptions = {}
): Promise<{ id: string }> {
  const status = input.status;
  const { data: maxRow } = await supabase
    .from("tasks")
    .select("position")
    .eq("social_profile_id", input.social_profile_id)
    .eq("status", status)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const nextPosition = (maxRow?.position ?? 0) + 1024;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      social_profile_id: input.social_profile_id,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      assignee_id: input.assignee_id ?? null,
      due_date: input.due_date ?? null,
      status,
      position: nextPosition,
      created_by: options.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}

export async function updateTask(
  supabase: SupabaseClient,
  taskId: string,
  patch: TaskPatchInput
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .is("deleted_at", null)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}

export async function addComment(
  supabase: SupabaseClient,
  taskId: string,
  input: TaskCommentInput,
  options: { actorId?: string } = {}
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      user_id: options.actorId ?? null,
      content: input.content,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}
