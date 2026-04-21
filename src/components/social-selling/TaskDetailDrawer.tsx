"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDateBR, formatDateTimeBR } from "@/lib/utils/format";
import { fetchTaskDetail, useAddComment, useUpdateTask } from "@/hooks/useTasks";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
  type TaskWithComments,
} from "@/types/task";

interface TaskDetailDrawerProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  assignees: { id: string; name: string | null; email: string }[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  em_andamento: "Em andamento",
  em_revisao: "Em revisão",
  concluido: "Concluído",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

function initialsFrom(value: string | null): string {
  if (!value) return "?";
  const parts = value.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

export function TaskDetailDrawer({
  taskId,
  open,
  onOpenChange,
  profileId,
  assignees,
}: TaskDetailDrawerProps) {
  const [detail, setDetail] = useState<TaskWithComments | null>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const updateMutation = useUpdateTask(profileId);
  const commentMutation = useAddComment();

  useEffect(() => {
    if (!open || !taskId) {
      setDetail(null);
      setComment("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchTaskDetail(taskId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  async function patch(
    patchBody: Parameters<typeof updateMutation.mutateAsync>[0]["patch"]
  ) {
    if (!detail) return;
    try {
      await updateMutation.mutateAsync({ id: detail.id, patch: patchBody });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              ...patchBody,
              updated_at: new Date().toISOString(),
            }
          : prev
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !comment.trim()) return;
    try {
      await commentMutation.mutateAsync({
        taskId: detail.id,
        input: { content: comment.trim() },
      });
      toast.success("Comentário adicionado");
      const refreshed = await fetchTaskDetail(detail.id);
      setDetail(refreshed);
      setComment("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível comentar", { description: message });
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader>
          <DrawerTitle>
            {loading ? "Carregando..." : detail?.title ?? "Task"}
          </DrawerTitle>
          {detail ? (
            <DrawerDescription>
              Atualizada em {formatDateTimeBR(detail.updated_at)}
            </DrawerDescription>
          ) : null}
        </DrawerHeader>

        {detail ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-3 text-sm">
            <section className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={detail.status}
                  onValueChange={(value) =>
                    patch({ status: value as TaskStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select
                  value={detail.priority}
                  onValueChange={(value) =>
                    patch({ priority: value as TaskPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Assignee</Label>
                <Select
                  value={detail.assignee_id ?? "__none"}
                  onValueChange={(value) =>
                    patch({ assignee_id: value === "__none" ? null : value })
                  }
                >
                  <SelectTrigger>
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
              <div className="space-y-1">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={detail.due_date ?? ""}
                  onChange={(event) =>
                    patch({ due_date: event.target.value || null })
                  }
                />
              </div>
            </section>

            {detail.description ? (
              <section className="space-y-1">
                <Label>Descrição</Label>
                <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">
                  {detail.description}
                </p>
              </section>
            ) : null}

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Comentários</h3>
                <Badge
                  variant="outline"
                  className="rounded-full border-border text-[10px]"
                >
                  {detail.comments.length}
                </Badge>
              </div>

              <ul className="space-y-2">
                {detail.comments.length === 0 ? (
                  <li className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    Nenhum comentário.
                  </li>
                ) : (
                  detail.comments.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex gap-3 rounded-md border border-border bg-card p-3"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">
                          {initialsFrom(entry.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-medium">
                            {entry.user_name ?? "Usuário"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateBR(entry.created_at)}
                          </span>
                        </div>
                        <p className={cn("whitespace-pre-wrap text-sm")}>
                          {entry.content}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>

              <form onSubmit={submitComment} className="flex items-center gap-2">
                <Input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Adicionar comentário..."
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!comment.trim() || commentMutation.isPending}
                  aria-label="Enviar"
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </section>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full">
              Fechar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
