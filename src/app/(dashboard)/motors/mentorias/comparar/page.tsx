"use client";

import { useMemo, useState } from "react";
import { GitCompare } from "lucide-react";

import { useMentorias } from "@/hooks/useMentorias";
import { CompareSelector } from "@/components/mentorias/CompareSelector";
import { CompareGrid } from "@/components/mentorias/CompareGrid";
import { CompareDiffTable } from "@/components/mentorias/CompareDiffTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";

export default function CompararMentoriasPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const query = useMentorias({});

  const mentorias = query.data ?? [];

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => mentorias.find((m) => m.id === id))
        .filter((m): m is (typeof mentorias)[number] => Boolean(m)),
    [selectedIds, mentorias]
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Comparar Mentorias
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecione 2 a 4 mentorias para visualizar lado a lado e comparar
          variações.
        </p>
      </header>

      {query.isLoading ? (
        <LoadingState count={3} />
      ) : (
        <>
          <CompareSelector
            mentorias={mentorias}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
          />

          {selected.length === 0 ? (
            <EmptyState
              icon={GitCompare}
              title="Nenhuma mentoria selecionada"
              description="Use o seletor acima para começar a comparação."
            />
          ) : (
            <div className="space-y-6">
              <CompareGrid mentorias={selected} />
              <CompareDiffTable mentorias={selected} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
