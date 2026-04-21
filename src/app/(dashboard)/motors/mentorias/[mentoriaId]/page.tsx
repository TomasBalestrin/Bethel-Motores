import { Plus, Workflow } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listMentorias } from "@/services/mentorias.service";
import { MentoriaMetricsGrid } from "@/components/mentorias/MentoriaMetricsGrid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";

interface PageProps {
  params: { mentoriaId: string };
}

export default async function MentoriaDashboardPage({ params }: PageProps) {
  const supabase = await createClient();
  const mentorias = await listMentorias(supabase, {}).catch(() => []);
  const metrics = mentorias.find((m) => m.id === params.mentoriaId) ?? null;

  return (
    <div className="space-y-8">
      <MentoriaMetricsGrid metrics={metrics} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold">Funis</h2>
          <Button variant="outline" disabled>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar Funil
          </Button>
        </div>
        <EmptyState
          icon={Workflow}
          title="Nenhum funil configurado"
          description="Funis aparecem aqui quando forem criados nesta mentoria."
        />
      </section>
    </div>
  );
}
