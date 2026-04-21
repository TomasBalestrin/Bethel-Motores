"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateBR } from "@/lib/utils/format";
import type { Task, TaskPriority } from "@/types/task";

interface TaskCardProps {
  task: Task;
  onOpen: () => void;
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  baixa: "border-border bg-muted text-muted-foreground",
  media: "border-primary/20 bg-primary/10 text-primary",
  alta: "border-warning/30 bg-warning/10 text-warning",
  urgente: "border-destructive/30 bg-destructive/10 text-destructive",
};

function initialsFrom(value: string | null): string {
  if (!value) return "?";
  const parts = value.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

export function TaskCard({ task, onOpen }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(event) => {
        if (isDragging) return;
        event.stopPropagation();
        onOpen();
      }}
      className={cn(
        "cursor-grab space-y-2 p-3 shadow-sm active:cursor-grabbing",
        isDragging && "border-primary/40 opacity-80 shadow-md"
      )}
    >
      <p className="text-sm font-medium leading-snug">{task.title}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge
          variant="outline"
          className={cn(
            "rounded-full border text-[10px]",
            PRIORITY_CLASSES[task.priority]
          )}
        >
          {PRIORITY_LABELS[task.priority]}
        </Badge>
        {task.due_date ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {formatDateBR(task.due_date)}
          </span>
        ) : null}
        <div className="ml-auto">
          {task.assignee ? (
            <Avatar className="h-6 w-6">
              {task.assignee.avatar_url ? (
                <AvatarImage
                  src={task.assignee.avatar_url}
                  alt={task.assignee.name ?? task.assignee.email}
                />
              ) : null}
              <AvatarFallback className="text-[10px]">
                {initialsFrom(task.assignee.name ?? task.assignee.email)}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
