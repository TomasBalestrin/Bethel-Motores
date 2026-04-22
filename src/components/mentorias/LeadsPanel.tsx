"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { useLeads, useInvalidateLeads } from "@/hooks/useLeads";
import { LeadsTable } from "./LeadsTable";
import { LeadFormModal } from "./LeadFormModal";
import { LeadImportModal } from "./LeadImportModal";

interface LeadsPanelProps {
  funnelId: string;
  funnelName: string;
}

const PAGE_SIZE = 100;

export function LeadsPanel({ funnelId, funnelName }: LeadsPanelProps) {
  const router = useRouter();
  const invalidate = useInvalidateLeads();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const queryParam = debouncedQuery.trim();

  const { data, isLoading, isFetching, error } = useLeads({
    funnelId,
    page,
    pageSize: PAGE_SIZE,
    query: queryParam,
  });

  const total = data?.total ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, page * PAGE_SIZE);

  function handleMutated() {
    invalidate(funnelId);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-sm sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome, telefone, @ ou nicho"
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 h-4 w-4" />
            Importar
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Novo lead
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </Button>
        </div>
      </div>

      <LeadFormModal
        mode="create"
        funnelId={funnelId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleMutated}
      />

      <LeadImportModal
        funnelId={funnelId}
        funnelName={funnelName}
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={handleMutated}
      />
    </div>
  );
}
