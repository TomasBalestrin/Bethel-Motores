import type { Metadata } from "next";
import { Plug } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listSources } from "@/services/integrations.service";
import { EmptyState } from "@/components/shared/EmptyState";
import { SourceCard } from "@/components/integrations/SourceCard";
import { SourceCreateModal } from "@/components/integrations/SourceCreateModal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Integrações" };

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const sources = await listSources(supabase).catch(() => []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Integrações
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure fontes que enviam eventos por webhook.
          </p>
        </div>
        <SourceCreateModal />
      </header>

      {sources.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="Nenhuma fonte configurada"
          description="Crie uma fonte para receber eventos via webhook."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      )}
    </div>
  );
}
