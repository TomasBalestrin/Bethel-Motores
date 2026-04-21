"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  taskCreateSchema,
  type TaskCreateInput,
} from "@/lib/validators/task";
import {
  TASK_PRIORITIES,
  type TaskPriority,
} from "@/types/task";
import { useCreateTask } from "@/hooks/useTasks";

interface TaskCreateModalProps {
  profileId: string;
  assignees: { id: string; name: string | null; email: string }[];
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export function TaskCreateModal({
  profileId,
  assignees,
}: TaskCreateModalProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateTask(profileId);

  const form = useForm<TaskCreateInput>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: {
      social_profile_id: profileId,
      title: "",
      description: "",
      priority: "media",
      assignee_id: null,
      due_date: null,
      status: "backlog",
    },
  });

  async function onSubmit(input: TaskCreateInput) {
    try {
      await createMutation.mutateAsync({
        ...input,
        social_profile_id: profileId,
        description: input.description ?? null,
        assignee_id: input.assignee_id || null,
        due_date: input.due_date || null,
      });
      toast.success("Task criada");
      form.reset({
        social_profile_id: profileId,
        title: "",
        description: "",
        priority: "media",
        assignee_id: null,
        due_date: null,
        status: "backlog",
      });
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível criar", { description: message });
    }
  }

  const submitting = form.formState.isSubmitting || createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Nova task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova task</DialogTitle>
          <DialogDescription>
            Adicione uma task ao backlog deste perfil.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              placeholder="Gravar stories do lançamento"
              {...form.register("title")}
            />
            {form.formState.errors.title ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-desc">Descrição</Label>
            <textarea
              id="task-desc"
              className="min-h-[80px] w-full rounded-md border border-border bg-background p-2 text-sm"
              {...form.register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="task-priority">Prioridade</Label>
              <Select
                value={form.watch("priority") ?? "media"}
                onValueChange={(value) =>
                  form.setValue("priority", value as TaskPriority)
                }
              >
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {PRIORITY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                {...form.register("due_date", {
                  setValueAs: (value) =>
                    value === "" || value == null ? null : String(value),
                })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-assignee">Assignee</Label>
            <Select
              value={form.watch("assignee_id") ?? "__none"}
              onValueChange={(value) =>
                form.setValue(
                  "assignee_id",
                  value === "__none" ? null : value
                )
              }
            >
              <SelectTrigger id="task-assignee">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem assignee</SelectItem>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name ?? assignee.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Criar task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
