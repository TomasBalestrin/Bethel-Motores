"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Task, TaskStatus } from "@/types/task";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
}

export function KanbanColumn({
  status,
  label,
  tasks,
  onOpenTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-[400px] w-72 flex-shrink-0 flex-col gap-2 rounded-md border border-border bg-muted/30 p-2 transition-colors",
        isOver && "border-primary/40 bg-primary/5"
      )}
    >
      <header className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Badge
          variant="outline"
          className="rounded-full border-border bg-background text-[10px]"
        >
          {tasks.length}
        </Badge>
      </header>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
              Solte tasks aqui
            </p>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={() => onOpenTask(task)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
