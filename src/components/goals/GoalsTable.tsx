"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";
import type { GoalWithScope } from "@/services/goals.service";

interface GoalsTableProps {
  goals: GoalWithScope[];
}

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatScope(goal: GoalWithScope): string {
  if (goal.scope_type === "motor") return goal.motor?.name ?? "Motor";
  return goal.mentoria?.name ?? "Mentoria";
}

function formatPeriod(goal: GoalWithScope): string {
  return `${MONTH_LABELS[goal.period_month - 1]}/${goal.period_year}`;
}

export function GoalsTable({ goals }: GoalsTableProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (goals.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhuma meta cadastrada.
      </p>
    );
  }

  function startEdit(goal: GoalWithScope) {
    setEditingId(goal.id);
    setDraftValue(String(goal.target_value));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftValue("");
  }

  async function saveEdit(goal: GoalWithScope) {
    const numeric = Number(draftValue.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric < 0) {
      toast.error("Valor inválido");
      return;
    }
    setPendingId(goal.id);
    try {
      const response = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: goal.id,
          patch: { target_value: numeric },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao salvar"
        );
      }
      toast.success("Meta atualizada");
      cancelEdit();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
    } finally {
      setPendingId(null);
    }
  }

  async function remove(goal: GoalWithScope) {
    setPendingId(goal.id);
    try {
      const response = await fetch("/api/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goal.id }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao remover"
        );
      }
      toast.success("Meta removida");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível remover", { description: message });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Escopo</TableHead>
            <TableHead>Métrica</TableHead>
            <TableHead>Período</TableHead>
            <TableHead className="text-right">Valor alvo</TableHead>
            <TableHead className="w-[120px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {goals.map((goal) => {
            const isEditing = editingId === goal.id;
            const isPending = pendingId === goal.id;
            return (
              <TableRow key={goal.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-border text-[10px] capitalize"
                    >
                      {goal.scope_type}
                    </Badge>
                    <span>{formatScope(goal)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs">{goal.metric_key}</code>
                </TableCell>
                <TableCell>{formatPeriod(goal)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {isEditing ? (
                    <Input
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={draftValue}
                      onChange={(event) => setDraftValue(event.target.value)}
                      className="h-8 w-32 text-right"
                    />
                  ) : (
                    formatCurrency(goal.target_value)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => saveEdit(goal)}
                          disabled={isPending}
                          aria-label="Salvar"
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 text-success" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={cancelEdit}
                          aria-label="Cancelar"
                          disabled={isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(goal)}
                          aria-label="Editar"
                          disabled={isPending}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(goal)}
                          aria-label="Remover"
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
