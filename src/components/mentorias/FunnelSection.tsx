"use client";

import { useState } from "react";
import { Workflow } from "lucide-react";

import { useFunnels } from "@/hooks/useFunnels";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { FunnelAddModal } from "./FunnelAddModal";
import { FunnelCard } from "./FunnelCard";
import { FunnelEditDrawer } from "./FunnelEditDrawer";
import type { FunnelWithTemplate } from "@/types/funnel";

interface FunnelSectionProps {
  mentoriaId: string;
}

export function FunnelSection({ mentoriaId }: FunnelSectionProps) {
  const [editing, setEditing] = useState<FunnelWithTemplate | null>(null);
  const query = useFunnels(mentoriaId);

  const funnels = query.data ?? [];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">Funis</h2>
        <FunnelAddModal mentoriaId={mentoriaId} />
      </div>

      {query.isLoading ? (
        <LoadingState count={2} />
      ) : query.isError ? (
        <EmptyState
          icon={Workflow}
          title="Não foi possível carregar os funis"
          description="Verifique sua conexão e tente novamente."
        />
      ) : funnels.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Nenhum funil configurado"
          description="Adicione o primeiro funil da mentoria para começar a medir."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {funnels.map((funnel) => (
            <FunnelCard
              key={funnel.id}
              funnel={funnel}
              onEdit={() => setEditing(funnel)}
            />
          ))}
        </div>
      )}

      <FunnelEditDrawer
        mentoriaId={mentoriaId}
        funnel={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </section>
  );
}
