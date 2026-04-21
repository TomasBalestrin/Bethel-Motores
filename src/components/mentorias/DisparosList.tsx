"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTimeBR, formatInteger } from "@/lib/utils/format";
import type { DisparoEvent } from "@/services/mentorias.service";
import { DisparoEventDrawer } from "./DisparoEventDrawer";
import { DisparoFormModal } from "./DisparoFormModal";

interface DisparosListProps {
  events: DisparoEvent[];
  mentoriaId: string;
}

const STATUS_LABEL: Record<DisparoEvent["status"], string> = {
  pending: "Pendente",
  processed: "Processado",
  error: "Erro",
  skipped: "Ignorado",
};

const STATUS_CLASSES: Record<DisparoEvent["status"], string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  processed: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  skipped: "bg-muted text-muted-foreground border-border",
};

export function DisparosList({ events, mentoriaId }: DisparosListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<DisparoEvent | null>(null);
  const [editing, setEditing] = useState<DisparoEvent | null>(null);
  const [deleting, setDeleting] = useState<DisparoEvent | null>(null);
  const [isDeletingBusy, setIsDeletingBusy] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setIsDeletingBusy(true);
    try {
      const response = await fetch(`/api/disparos/${deleting.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string" ? data.error : "Erro ao excluir"
        );
      }
      toast.success("Disparo excluído");
      setDeleting(null);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível excluir", { description: message });
    } finally {
      setIsDeletingBusy(false);
    }
  }

  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhum disparo registrado para esta mentoria.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Funil</TableHead>
              <TableHead className="text-right">Enviado</TableHead>
              <TableHead className="text-right">Entregue</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} className="hover:bg-muted/40">
                <TableCell
                  className="tabular-nums cursor-pointer"
                  onClick={() => setSelected(event)}
                >
                  {formatDateTimeBR(event.received_at)}
                </TableCell>
                <TableCell
                  className="text-sm text-muted-foreground cursor-pointer"
                  onClick={() => setSelected(event)}
                >
                  {event.funnel_label ?? "—"}
                </TableCell>
                <TableCell
                  className="text-right font-medium tabular-nums cursor-pointer"
                  onClick={() => setSelected(event)}
                >
                  {formatInteger(event.volume_sent)}
                </TableCell>
                <TableCell
                  className="text-right tabular-nums cursor-pointer"
                  onClick={() => setSelected(event)}
                >
                  {formatInteger(event.volume_delivered)}
                </TableCell>
                <TableCell
                  className="text-right tabular-nums cursor-pointer"
                  onClick={() => setSelected(event)}
                >
                  {formatCurrency(event.cost)}
                </TableCell>
                <TableCell
                  className="cursor-pointer"
                  onClick={() => setSelected(event)}
                >
                  <span className="inline-flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border text-[10px]",
                        STATUS_CLASSES[event.status]
                      )}
                    >
                      {STATUS_LABEL[event.status]}
                    </Badge>
                    {event.status === "error" ? (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    ) : null}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Editar disparo"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(event);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Excluir disparo"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(event);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DisparoEventDrawer
        event={selected}
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
      />

      {editing ? (
        <DisparoFormModal
          mode="edit"
          mentoriaId={mentoriaId}
          disparo={editing}
          open={true}
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      ) : null}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next && !isDeletingBusy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir disparo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento será removido do
              histórico da mentoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBusy}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={isDeletingBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingBusy ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
