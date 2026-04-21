import { createClient } from "@/lib/supabase/server";
import { listMentorias } from "@/services/mentorias.service";
import { MentoriaMetricsGrid } from "@/components/mentorias/MentoriaMetricsGrid";
import { FunnelSection } from "@/components/mentorias/FunnelSection";

interface PageProps {
  params: { mentoriaId: string };
}

export default async function MentoriaDashboardPage({ params }: PageProps) {
  const supabase = await createClient();
  const mentorias = await listMentorias(supabase, {}).catch(() => []);
  const metrics = mentorias.find((m) => m.id === params.mentoriaId) ?? null;

  return (
    <div className="space-y-8">
      <MentoriaMetricsGrid
        mentoriaId={params.mentoriaId}
        metrics={metrics}
      />
      <FunnelSection mentoriaId={params.mentoriaId} />
    </div>
  );
}
