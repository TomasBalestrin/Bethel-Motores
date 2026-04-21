import { GraduationCap } from "lucide-react";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { listMentorias } from "@/services/mentorias.service";
import {
  MENTORIA_SORT_OPTIONS,
  MENTORIA_STATUSES,
  type MentoriaSort,
  type MentoriaStatus,
} from "@/lib/validators/mentoria";
import { MentoriaCard } from "@/components/mentorias/MentoriaCard";
import { MentoriaFilters } from "@/components/mentorias/MentoriaFilters";
import { MentoriaFormModal } from "@/components/mentorias/MentoriaFormModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Listagem de Mentorias" };

interface PageProps {
  searchParams: {
    query?: string;
    status?: string;
    sort?: string;
  };
}

function parseStatus(value: string | undefined): MentoriaStatus | "all" {
  if (!value) return "all";
  if (value === "all") return "all";
  return (MENTORIA_STATUSES as readonly string[]).includes(value)
    ? (value as MentoriaStatus)
    : "all";
}

function parseSort(value: string | undefined): MentoriaSort {
  if (!value) return "recent";
  return (MENTORIA_SORT_OPTIONS as readonly string[]).includes(value)
    ? (value as MentoriaSort)
    : "recent";
}

export default function MentoriasListagemPage({ searchParams }: PageProps) {
  const filters = {
    query: searchParams.query?.trim() || undefined,
    status: parseStatus(searchParams.status),
    sort: parseSort(searchParams.sort),
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Mentorias
          </h1>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
            <MentoriasSubtitle filters={filters} />
          </Suspense>
        </div>
        <MentoriaFormModal />
      </header>

      <MentoriaFilters />

      <Suspense fallback={<LoadingState count={6} />}>
        <MentoriasGrid filters={filters} />
      </Suspense>
    </div>
  );
}

async function MentoriasSubtitle({
  filters,
}: {
  filters: { query?: string; status: MentoriaStatus | "all"; sort: MentoriaSort };
}) {
  const supabase = await createClient();
  try {
    const mentorias = await listMentorias(supabase, filters);
    const count = mentorias.length;
    return (
      <p className="text-sm text-muted-foreground">
        {count === 1 ? "1 mentoria encontrada" : `${count} mentorias encontradas`}
      </p>
    );
  } catch {
    return <p className="text-sm text-muted-foreground">— mentorias</p>;
  }
}

async function MentoriasGrid({
  filters,
}: {
  filters: { query?: string; status: MentoriaStatus | "all"; sort: MentoriaSort };
}) {
  const supabase = await createClient();

  try {
    const mentorias = await listMentorias(supabase, filters);

    if (mentorias.length === 0) {
      return (
        <EmptyState
          icon={GraduationCap}
          title="Nenhuma mentoria encontrada"
          description={
            filters.query || filters.status !== "all"
              ? "Ajuste os filtros ou crie uma nova mentoria."
              : "Cadastre a primeira mentoria do motor."
          }
        />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mentorias.map((mentoria) => (
          <MentoriaCard key={mentoria.id} mentoria={mentoria} />
        ))}
      </div>
    );
  } catch (error) {
    console.error("[/motors/mentorias/listagem]", error);
    return (
      <EmptyState
        icon={GraduationCap}
        title="Não foi possível carregar as mentorias"
        description="Verifique a conexão com o banco e tente novamente."
      />
    );
  }
}
