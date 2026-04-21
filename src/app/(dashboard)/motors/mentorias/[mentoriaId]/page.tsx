import { cachedGetMentoriaWithMetrics } from "@/services/mentorias.cached";
import { MentoriaMetricsGrid } from "@/components/mentorias/MentoriaMetricsGrid";
import { FunnelSection } from "@/components/mentorias/FunnelSection";

interface PageProps {
  params: { mentoriaId: string };
}

export default async function MentoriaDashboardPage({ params }: PageProps) {
  const metrics = await cachedGetMentoriaWithMetrics(params.mentoriaId).catch(
    () => null
  );

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
