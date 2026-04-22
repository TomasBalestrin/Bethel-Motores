"use client";

import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/utils/format";
import type { Lead } from "@/types/lead";
import { LeadFormModal } from "./LeadFormModal";

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  onMutated: () => void;
}

const ROW_HEIGHT = 48;

// Grid: nome | telefone | instagram | faturamento | nicho | 5 toggles | valor-venda | valor-entrada | ações
const GRID_COLS =
  "220px 140px 140px 110px 120px 82px 92px 110px 90px 72px 120px 120px 68px";
const GRID_WIDTH = 1560;

type ToggleKey =
  | "joined_group"
  | "confirmed_presence"
  | "attended"
  | "scheduled"
  | "sold";

const TOGGLES: { key: ToggleKey; label: string; title: string }[] = [
  { key: "joined_group", label: "Grupo", title: "Entrou no grupo" },
  { key: "confirmed_presence", label: "Presença", title: "Confirmou presença" },
  { key: "attended", label: "Compareceu", title: "Compareceu" },
  { key: "scheduled", label: "Agendado", title: "Agendado" },
  { key: "sold", label: "Venda", title: "Venda" },
];

function parseMoney(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[R$\s ]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoneyInput(value: number | null): string {
  if (value == null) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ToggleCell({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "inline-flex h-7 w-full items-center justify-center rounded-full text-[11px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      {label}
    </button>
  );
}

function MoneyInlineInput({
  lead,
  field,
  onCommit,
}: {
  lead: Lead;
  field: "sale_value" | "entry_value";
  onCommit: (value: number | null) => void;
}) {
  const current = lead[field];
  const [value, setValue] = useState(formatMoneyInput(current));
  const disabled = !lead.sold;

  function commit() {
    const parsed = parseMoney(value);
    if (parsed === current) return;
    onCommit(parsed);
  }

  return (
    <Input
      value={disabled ? "" : value}
      onChange={(event) => setValue(event.target.value)}
      onFocus={() => setValue(formatMoneyInput(current))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
      disabled={disabled}
      placeholder={disabled ? "—" : "0,00"}
      className="h-7 w-full px-2 text-right text-xs tabular-nums"
      inputMode="decimal"
    />
  );
}

interface LeadRowProps {
  lead: Lead;
  onPatched: (id: string, patch: Partial<Lead>) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

function LeadRow({ lead, onPatched, onEdit, onDelete }: LeadRowProps) {
  async function patch(body: Partial<Lead>) {
    const before: Partial<Lead> = {};
    for (const key of Object.keys(body) as (keyof Lead)[]) {
      (before as Record<string, unknown>)[key] = lead[key];
    }
    onPatched(lead.id, body);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string" ? data.error : "Erro ao atualizar"
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
      onPatched(lead.id, before);
    }
  }

  return (
    <div
      className="grid items-center gap-2 border-b border-border px-3 text-xs hover:bg-muted/30"
      style={{ gridTemplateColumns: GRID_COLS, height: ROW_HEIGHT }}
    >
      <div className="truncate font-medium">{lead.name}</div>
      <div className="truncate text-muted-foreground">{lead.phone ?? "—"}</div>
      <div className="truncate text-muted-foreground">
        {lead.instagram_handle
          ? `@${lead.instagram_handle.replace(/^@/, "")}`
          : "—"}
      </div>
      <div className="text-right tabular-nums text-muted-foreground">
        {lead.revenue == null ? "—" : formatCurrency(lead.revenue)}
      </div>
      <div className="truncate text-muted-foreground">{lead.niche ?? "—"}</div>
      {TOGGLES.map((toggle) => (
        <ToggleCell
          key={toggle.key}
          active={Boolean(lead[toggle.key])}
          label={toggle.label}
          title={toggle.title}
          onClick={() =>
            patch({ [toggle.key]: !lead[toggle.key] } as Partial<Lead>)
          }
        />
      ))}
      <MoneyInlineInput
        key={`sale-${lead.id}-${lead.sold ? 1 : 0}-${lead.sale_value ?? "null"}`}
        lead={lead}
        field="sale_value"
        onCommit={(value) => patch({ sale_value: value })}
      />
      <MoneyInlineInput
        key={`entry-${lead.id}-${lead.sold ? 1 : 0}-${lead.entry_value ?? "null"}`}
        lead={lead}
        field="entry_value"
        onCommit={(value) => patch({ entry_value: value })}
      />
      <div className="flex justify-end gap-0.5">
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Editar lead"
          onClick={() => onEdit(lead)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Excluir lead"
          onClick={() => onDelete(lead)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function LeadsTable({ leads, loading, onMutated }: LeadsTableProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, Partial<Lead>>>(
    {}
  );
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const decorated = leads.map((lead) => ({
    ...lead,
    ...(optimistic[lead.id] ?? {}),
  }));

  const virtualizer = useVirtualizer({
    count: decorated.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  function handleOptimistic(id: string, patch: Partial<Lead>) {
    setOptimistic((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...patch },
    }));
    Promise.resolve().then(onMutated);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const response = await fetch(`/api/leads/${deleting.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string" ? data.error : "Erro ao excluir"
        );
      }
      toast.success("Lead excluído");
      setDeleting(null);
      onMutated();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível excluir", { description: message });
    } finally {
      setDeletingBusy(false);
    }
  }

  const headerHeight = 36;
  const bodyHeight = Math.min(
    Math.max(decorated.length, 1) * ROW_HEIGHT,
    12 * ROW_HEIGHT
  );

  return (
    <div
      ref={parentRef}
      className="relative overflow-auto"
      style={{ height: headerHeight + bodyHeight + 2 }}
    >
      <div style={{ width: GRID_WIDTH, position: "relative" }}>
        <div
          className="sticky top-0 z-10 grid gap-2 border-b border-border bg-muted px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          style={{
            gridTemplateColumns: GRID_COLS,
            height: headerHeight,
            alignItems: "center",
          }}
        >
          <span>Nome</span>
          <span>Telefone</span>
          <span>Instagram</span>
          <span className="text-right">Faturamento</span>
          <span>Nicho</span>
          <span className="text-center">Grupo</span>
          <span className="text-center">Presença</span>
          <span className="text-center">Compareceu</span>
          <span className="text-center">Agendado</span>
          <span className="text-center">Venda</span>
          <span className="text-right">Valor venda</span>
          <span className="text-right">Valor entrada</span>
          <span className="text-right">Ações</span>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando leads...
          </div>
        ) : decorated.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lead cadastrado neste funil.
          </div>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: "relative",
              width: "100%",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const lead = decorated[virtualRow.index];
              if (!lead) return null;
              return (
                <div
                  key={lead.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <LeadRow
                    lead={lead}
                    onPatched={handleOptimistic}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing ? (
        <LeadFormModal
          mode="edit"
          funnelId={editing.funnel_id}
          lead={editing}
          open={true}
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          onSuccess={() => {
            setEditing(null);
            onMutated();
          }}
        />
      ) : null}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next && !deletingBusy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `"${deleting.name}" será removido. Esta ação não pode ser desfeita.`
                : "Confirme a exclusão."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={deletingBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBusy ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
