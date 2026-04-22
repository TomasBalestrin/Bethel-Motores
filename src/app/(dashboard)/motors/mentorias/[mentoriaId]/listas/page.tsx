import { GraduationCap } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listFunnelsByMentoria } from "@/services/funnels.service";
import { countLeadsByFunnel } from "@/services/leads.service";
import { getMentoriaById } from "@/services/mentorias.service";
import { EmptyState } from "@/components/shared/EmptyState";
import { LeadsSection } from "@/components/mentorias/LeadsSection";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { mentoriaId: string };
}

export default async function MentoriaListasPage({ params }: PageProps) {
  const supabase = await createClient();

  const [funnels, mentoria] = await Promise.all([
    listFunnelsByMentoria(supabase, params.mentoriaId).catch(() => []),
    getMentoriaById(supabase, params.mentoriaId).catch(() => null),
  ]);

  if (funnels.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Nenhum funil cadastrado"
        description="Crie um funil para esta mentoria antes de adicionar leads."
      />
    );
  }

  const counts = await Promise.all(
    funnels.map((f) => countLeadsByFunnel(supabase, f.id).catch(() => 0))
  );

  const funnelOptions = funnels.map((funnel, index) => ({
    id: funnel.id,
    name: funnel.name,
    count: counts[index] ?? 0,
  }));

  return (
    <LeadsSection
      mentoriaId={params.mentoriaId}
      mentoriaName={mentoria?.name ?? "Mentoria"}
      funnels={funnelOptions}
    />
  );
}
