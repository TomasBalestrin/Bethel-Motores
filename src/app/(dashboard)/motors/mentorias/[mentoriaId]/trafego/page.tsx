import { createClient } from "@/lib/supabase/server";
import {
  listTrafegoByMentoria,
  type TrafegoEntry,
} from "@/services/mentorias.service";
import { listFunnelsByMentoria } from "@/services/funnels.service";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { TrafegoChart } from "@/components/mentorias/TrafegoChart";
import { TrafegoInlineForm } from "@/components/mentorias/TrafegoInlineForm";
import { TrafegoTable } from "@/components/mentorias/TrafegoTable";

interface PageProps {
  params: { mentoriaId: string };
}

function sumInvestment(entries: TrafegoEntry[]): number {
  return entries.reduce((acc, entry) => acc + entry.investimento_trafego, 0);
}

export default async function TrafegoPage({ params }: PageProps) {
  const supabase = await createClient();
  const [entries, funnels] = await Promise.all([
    listTrafegoByMentoria(supabase, params.mentoriaId).catch(
      () => [] as TrafegoEntry[]
    ),
    listFunnelsByMentoria(supabase, params.mentoriaId).catch(() => []),
  ]);

  const total = sumInvestment(entries);
  const funnelOptions = funnels.map((funnel) => ({
    id: funnel.id,
    name: funnel.name,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[minmax(220px,auto)_1fr]">
        <Card className="flex flex-col justify-center gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total investido em tráfego
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {formatCurrency(total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {entries.length === 1
              ? "1 registro"
              : `${entries.length} registros`}
          </p>
        </Card>
        <TrafegoInlineForm
          mentoriaId={params.mentoriaId}
          funnels={funnelOptions}
        />
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="font-heading text-base font-semibold">
          Investimento diário
        </h2>
        <TrafegoChart entries={entries} />
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-heading text-base font-semibold">Registros</h2>
        <TrafegoTable entries={entries} />
      </Card>
    </div>
  );
}
