"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useDebounce } from "@/hooks/useDebounce";
import { useInvalidateLeads } from "@/hooks/useLeads";
import { useLeadsByMentoria } from "@/hooks/useLeadsByMentoria";
import { LeadsTable } from "./LeadsTable";
import { AttendanceImportModal } from "./AttendanceImportModal";
import { GroupImportModal } from "./GroupImportModal";

interface FunnelOption {
  id: string;
  name: string;
  count: number;
}

interface AllLeadsPanelProps {
  mentoriaId: string;
  mentoriaName: string;
  funnels: FunnelOption[];
}

const PAGE_SIZE = 100;

export function AllLeadsPanel({
  mentoriaId,
  mentoriaName,
  funnels,
}: AllLeadsPanelProps) {
  const router = useRouter();
  const invalidate = useInvalidateLeads();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [deleteSelectedBusy, setDeleteSelectedBusy] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const queryParam = debouncedQuery.trim();

  const { data, isLoading, isFetching, error } = useLeadsByMentoria({
    mentoriaId,
    page,
    pageSize: PAGE_SIZE,
    query: queryParam,
  });

  const funnelNames = useMemo(
    () => Object.fromEntries(funnels.map((f) => [f.id, f.name])),
    [funnels]
  );

  const total = data?.total ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, page * PAGE_SIZE);

  function handleMutated() {
    invalidate();
    router.refresh();
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setSelectedIds(new Set());
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
    setSelectedIds(new Set());
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    setDeleteSelectedBusy(true);
    try {
      const response = await fetch(
        `/api/mentorias/${mentoriaId}/leads/delete-bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selectedIds) }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string" ? data.error : "Erro ao excluir"
        );
      }
      toast.success(
        selectedIds.size === 1
          ? "1 lead excluído"
          : `${selectedIds.size} leads excluídos`
      );
      setSelectedIds(new Set());
      setDeleteSelectedOpen(false);
      handleMutated();
    } catch (error) {
      toast.error("Não foi possível excluir", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeleteSelectedBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-sm sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Buscar por nome, telefone, @ ou nicho"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteSelectedOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Excluir selecionados ({selectedIds.size})
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGroupOpen(true)}
          >
            <Users className="mr-1 h-4 w-4" />
            Importar grupos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAttendanceOpen(true)}
          >
            <UserCheck className="mr-1 h-4 w-4" />
            Importar comparecimento
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar leads"}
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <LeadsTable
          leads={data?.entries ?? []}
          loading={isLoading && !data}
          onMutated={handleMutated}
          funnelNames={funnelNames}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {total === 0
            ? isLoading
              ? "Carregando..."
              : "Nenhum lead"
            : `Exibindo ${rangeStart}–${rangeEnd} de ${total}`}
          {isFetching && total > 0 ? " · atualizando..." : null}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => handlePageChange(Math.max(1, page - 1))}
          >
            Anterior
          </Button>
          <span className="tabular-nums">
            Página {page} / {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
          >
            Próxima
          </Button>
        </div>
      </div>

      <AttendanceImportModal
        mentoriaId={mentoriaId}
        mentoriaName={mentoriaName}
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        onSuccess={handleMutated}
      />

      <GroupImportModal
        mentoriaId={mentoriaId}
        mentoriaName={mentoriaName}
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onSuccess={handleMutated}
      />

      <AlertDialog
        open={deleteSelectedOpen}
        onOpenChange={(next) => {
          if (!next && !deleteSelectedBusy) setDeleteSelectedOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir leads selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size === 1
                ? "1 lead será excluído permanentemente."
                : `${selectedIds.size} leads serão excluídos permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSelectedBusy}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteSelected();
              }}
              disabled={deleteSelectedBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSelectedBusy ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
