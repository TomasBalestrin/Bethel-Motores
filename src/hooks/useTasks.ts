"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { listTasksByProfile } from "@/services/tasks.service";
import type {
  TaskCommentInput,
  TaskCreateInput,
  TaskPatchInput,
} from "@/lib/validators/task";
import type { Task, TaskWithComments } from "@/types/task";

export const TASKS_QUERY_KEY = ["tasks"] as const;

export function useTasks(profileId: string, initialData?: Task[]) {
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, profileId],
    queryFn: () => listTasksByProfile(createClient(), profileId),
    initialData,
    staleTime: 10_000,
    enabled: Boolean(profileId),
  });
}

export function useCreateTask(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskCreateInput) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body?.error === "string" ? body.error : "Erro ao criar task"
        );
      }
      return (await response.json()) as { data: { id: string } };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...TASKS_QUERY_KEY, profileId] });
    },
  });
}

export function useUpdateTask(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TaskPatchInput;
    }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body?.error === "string" ? body.error : "Erro ao atualizar"
        );
      }
      return (await response.json()) as { data: { id: string } };
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: [...TASKS_QUERY_KEY, profileId] });
      const previous = qc.getQueryData<Task[]>([
        ...TASKS_QUERY_KEY,
        profileId,
      ]);
      if (previous) {
        qc.setQueryData<Task[]>(
          [...TASKS_QUERY_KEY, profileId],
          previous.map((task) =>
            task.id === id
              ? { ...task, ...patch, updated_at: new Date().toISOString() }
              : task
          )
        );
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(
          [...TASKS_QUERY_KEY, profileId],
          context.previous
        );
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [...TASKS_QUERY_KEY, profileId] });
    },
  });
}

export function useAddComment() {
  return useMutation({
    mutationFn: async ({
      taskId,
      input,
    }: {
      taskId: string;
      input: TaskCommentInput;
    }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: input.content }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : "Erro ao adicionar comentário"
        );
      }
      return (await response.json()) as { data: { id: string } };
    },
  });
}

export async function fetchTaskDetail(
  taskId: string
): Promise<TaskWithComments | null> {
  const response = await fetch(`/api/tasks/${taskId}`);
  if (!response.ok) return null;
  const payload = (await response.json()) as { data: TaskWithComments };
  return payload.data ?? null;
}
