"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Film,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
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
import { formatCompactNumber, formatCurrency } from "@/lib/utils/format";
import type { CreativeWithSpend } from "@/services/creatives.service";
import { CreativeFormModal } from "./CreativeFormModal";

interface CreativesSectionProps {
  mentoriaId: string;
  creatives: CreativeWithSpend[];
}

function formatPct(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return `${value.toFixed(digits)}%`;
}

function formatFraction(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function CreativesSection({
  mentoriaId,
  creatives,
}: CreativesSectionProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CreativeWithSpend | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CreativeWithSpend | null>(
    null
  );
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const response = await fetch(`/api/creatives/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao excluir"
        );
      }
      toast.success("Criativo excluído");
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível excluir", { description: message });
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Criativos</h2>
          <p className="text-xs text-muted-foreground">
            {creatives.length === 0
              ? "Cadastre os criativos usados no tráfego desta mentoria"
              : `${creatives.length} criativo${creatives.length === 1 ? "" : "s"} cadastrado${creatives.length === 1 ? "" : "s"} · clique na linha pra editar`}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Novo criativo
        </Button>
      </div>

      {creatives.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum criativo cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Código</TableHead>
                <TableHead className="w-[90px]">Tipo</TableHead>
                <TableHead className="min-w-[200px]">Headline</TableHead>
                <TableHead className="w-[100px] text-right">Investido</TableHead>
                <TableHead className="w-[60px] text-right">Leads</TableHead>
                <TableHead className="w-[80px] text-right">CPL</TableHead>
                <TableHead className="w-[70px] text-right">CTR</TableHead>
                <TableHead className="w-[70px] text-right">Hook</TableHead>
                <TableHead className="w-[90px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creatives.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => setEditTarget(c)}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    !c.is_active && "opacity-60"
                  )}
                >
                  <TableCell className="font-medium">{c.code}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px]">
                      {c.format === "video" ? (
                        <>
                          <Film className="h-3 w-3" />
                          Vídeo
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-3 w-3" />
                          Estático
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell
                    className="max-w-[260px] truncate text-xs"
                    title={c.headline ?? ""}
                  >
                    {c.headline ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(c.spent)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCompactNumber(c.leads)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.cpl !== null ? formatCurrency(c.cpl) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPct(c.ctr)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.format === "video" ? formatFraction(c.hook_rate_3s) : "—"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-0.5">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Editar"
                        onClick={() => setEditTarget(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Excluir"
                        onClick={() => setDeleteTarget(c)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreativeFormModal
        mentoriaId={mentoriaId}
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {editTarget ? (
        <CreativeFormModal
          mentoriaId={mentoriaId}
          mode="edit"
          creative={editTarget}
          open={editTarget !== null}
          onOpenChange={(next) => {
            if (!next) setEditTarget(null);
          }}
        />
      ) : null}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next && !deleteBusy) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir criativo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.code}" será removido. Lançamentos de tráfego vinculados ficam sem criativo.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={deleteBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBusy ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
