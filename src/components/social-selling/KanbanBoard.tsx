"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types/task";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCreateModal } from "./TaskCreateModal";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

interface KanbanBoardProps {
  profileId: string;
  initialTasks: Task[];
  assignees: { id: string; name: string | null; email: string }[];
}

const COLUMN_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  em_andamento: "Em andamento",
  em_revisao: "Em revisão",
  concluido: "Concluído",
};

function computeNewPosition(
  column: Task[],
  overId: string,
  activeId: string
): number {
  const filtered = column.filter((task) => task.id !== activeId);
  const overIndex = filtered.findIndex((task) => task.id === overId);

  if (overIndex < 0) {
    const last = filtered[filtered.length - 1];
    return (last?.position ?? 0) + 1024;
  }

  const prev = filtered[overIndex - 1];
  const next = filtered[overIndex];

  if (!prev && next) return next.position / 2;
  if (prev && !next) return prev.position + 1024;
  if (prev && next) return (prev.position + next.position) / 2;
  return 1024;
}

export function KanbanBoard({
  profileId,
  initialTasks,
  assignees,
}: KanbanBoardProps) {
  const tasksQuery = useTasks(profileId, initialTasks);
  const updateMutation = useUpdateTask(profileId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const [query, setQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const tasks = tasksQuery.data ?? initialTasks;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (assigneeFilter !== "all") {
        const matches =
          assigneeFilter === "none"
            ? task.assignee_id == null
            : task.assignee_id === assigneeFilter;
        if (!matches) return false;
      }
      if (!term) return true;
      return task.title.toLowerCase().includes(term);
    });
  }, [tasks, query, assigneeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const status of TASK_STATUSES) map.set(status, []);
    for (const task of filtered) {
      map.get(task.status)?.push(task);
    }
    for (const status of TASK_STATUSES) {
      map.get(status)?.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [filtered]);

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overIdRaw = String(over.id);
    const activeTask = tasks.find((task) => task.id === activeId);
    if (!activeTask) return;

    let destinationStatus: TaskStatus;
    let overTaskId: string | null = null;

    if (overIdRaw.startsWith("column:")) {
      destinationStatus = overIdRaw.replace("column:", "") as TaskStatus;
    } else {
      const overTask = tasks.find((task) => task.id === overIdRaw);
      if (!overTask) return;
      destinationStatus = overTask.status;
      overTaskId = overTask.id;
    }

    const columnTasks = grouped.get(destinationStatus) ?? [];
    const newPosition = overTaskId
      ? computeNewPosition(columnTasks, overTaskId, activeId)
      : (columnTasks[columnTasks.length - 1]?.position ?? 0) + 1024;

    if (
      destinationStatus === activeTask.status &&
      Math.abs(newPosition - activeTask.position) < 0.0001
    ) {
      return;
    }

    updateMutation.mutate(
      {
        id: activeId,
        patch: { status: destinationStatus, position: newPosition },
      },
      {
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : "Erro desconhecido";
          toast.error("Não foi possível mover a task", { description: message });
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar task..."
              className="pl-8"
            />
          </div>
          <Select
            value={assigneeFilter}
            onValueChange={(value) => setAssigneeFilter(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="none">Sem assignee</SelectItem>
              {assignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.name ?? assignee.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TaskCreateModal profileId={profileId} assignees={assignees} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              label={COLUMN_LABELS[status]}
              tasks={grouped.get(status) ?? []}
              onOpenTask={(task) => {
                if (draggingId) return;
                setDetailTaskId(task.id);
              }}
            />
          ))}
        </div>
      </DndContext>

      <TaskDetailDrawer
        taskId={detailTaskId}
        open={detailTaskId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTaskId(null);
        }}
        profileId={profileId}
        assignees={assignees}
      />
    </div>
  );
}
