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

const ROW_HEIGHT = 56;
const TOGGLES: { key: ToggleKey; short: string; label: string }[] = [
  { key: "joined_group", short: "Grupo", label: "Entrou no grupo" },
  { key: "confirmed_presence", short: "Presença", label: "Confirmou presença" },
  { key: "attended", short: "Compareceu", label: "Compareceu" },
  { key: "scheduled", short: "Agendado", label: "Agendado" },
  { key: "sold", short: "Venda", label: "Venda" },
];

type ToggleKey =
  | "joined_group"
  | "confirmed_presence"
  | "attended"
  | "scheduled"
  | "sold";

function parseMoney(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[R$\s ]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function ToggleButton({
  active,
  onClick,
  label,
  short,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  short: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-full px-2.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      {short}
    </button>
  );
}

function MoneyInlineInput({
  defaultValue,
  onCommit,
  placeholder,
}: {
  defaultValue: number | null;
  onCommit: (value: number | null) => void;
  placeholder: string;
}) {
  const initial =
    defaultValue == null
      ? ""
      : defaultValue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const [value, setValue] = useState(initial);

  function commit() {
    const parsed = parseMoney(value);
    if (parsed === defaultValue) return;
    onCommit(parsed);
  }

  return (
    <Input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          (event.target as HTMLInputElement).blur();
        }
      }}
      placeholder={placeholder}
      className="h-7 w-24 px-2 text-xs tabular-nums"
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
      onPatched(lead.id, {
        joined_group: lead.joined_group,
        confirmed_presence: lead.confirmed_presence,
        attended: lead.attended,
        scheduled: lead.scheduled,
        sold: lead.sold,
        sale_value: lead.sale_value,
        entry_value: lead.entry_value,
      });
    }
  }

  return (
    <div className="grid grid-cols-[220px_140px_140px_120px_140px_1fr_80px] items-center gap-3 border-b border-border px-3 text-xs">
      <div className="truncate font-medium">{lead.name}</div>
      <div className="truncate text-muted-foreground">{lead.phone ?? "—"}</div>
      <div className="truncate text-muted-foreground">
        {lead.instagram_handle ? `@${lead.instagram_handle.replace(/^@/, "")}` : "—"}
      </div>
      <div className="text-right tabular-nums text-muted-foreground">
        {lead.revenue == null ? "—" : formatCurrency(lead.revenue)}
      </div>
      <div className="truncate text-muted-foreground">{lead.niche ?? "—"}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {TOGGLES.map((toggle) => (
          <ToggleButton
            key={toggle.key}
            active={Boolean(lead[toggle.key])}
            short={toggle.short}
            label={toggle.label}
            onClick={() => patch({ [toggle.key]: !lead[toggle.key] } as Partial<Lead>)}
          />
        ))}
        {lead.sold ? (
          <>
            <MoneyInlineInput
              key={`sale-${lead.id}-${lead.sale_value ?? "null"}`}
              defaultValue={lead.sale_value}
              placeholder="Venda"
              onCommit={(value) => patch({ sale_value: value })}
            />
            <MoneyInlineInput
              key={`entry-${lead.id}-${lead.entry_value ?? "null"}`}
              defaultValue={lead.entry_value}
              placeholder="Entrada"
              onCommit={(value) => patch({ entry_value: value })}
            />
          </>
        ) : null}
      </div>
      <div className="flex justify-end gap-1">
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
  const [optimistic, setOptimistic] = useState<
    Record<string, Partial<Lead>>
  >({});
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

  return (
    <div>
      <div className="grid grid-cols-[220px_140px_140px_120px_140px_1fr_80px] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Nome</span>
        <span>Telefone</span>
        <span>Instagram</span>
        <span className="text-right">Faturamento</span>
        <span>Nicho</span>
        <span>Status / Valores</span>
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
          ref={parentRef}
          className="relative overflow-auto"
          style={{ height: Math.min(600, decorated.length * ROW_HEIGHT + 8) }}
        >
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: "relative",
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
        </div>
      )}

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

