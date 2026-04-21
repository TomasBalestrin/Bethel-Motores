import { createClient } from "@/lib/supabase/server";
import {
  listDisparosByMentoria,
  type DisparoEvent,
} from "@/services/mentorias.service";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatInteger } from "@/lib/utils/format";
import { DisparosList } from "@/components/mentorias/DisparosList";
import { DisparoFormModal } from "@/components/mentorias/DisparoFormModal";

interface PageProps {
  params: { mentoriaId: string };
}

function totals(events: DisparoEvent[]) {
  let volume = 0;
  let cost = 0;
  let errors = 0;
  for (const event of events) {
    volume += event.volume_sent;
    cost += event.cost;
    if (event.status === "error") errors += 1;
  }
  return { volume, cost, errors };
}

export default async function DisparosPage({ params }: PageProps) {
  const supabase = await createClient();
  const events = await listDisparosByMentoria(supabase, params.mentoriaId).catch(
    () => [] as DisparoEvent[]
  );

  const { volume, cost, errors } = totals(events);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="space-y-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Volume total enviado
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {formatInteger(volume)}
          </p>
        </Card>
        <Card className="space-y-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Custo total (API)
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {formatCurrency(cost)}
          </p>
        </Card>
        <Card className="space-y-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Eventos com erro
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {errors}
          </p>
        </Card>
      </div>

      <Card className="space-y-3 p-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h2 className="font-heading text-base font-semibold">
              Eventos de disparos
            </h2>
            <p className="text-xs text-muted-foreground">
              Clique na linha pra ver payload e reprocessar, ou use os botões
              ao lado para editar/excluir manualmente.
            </p>
          </div>
          <DisparoFormModal mentoriaId={params.mentoriaId} />
        </header>
        <DisparosList events={events} mentoriaId={params.mentoriaId} />
      </Card>
    </div>
  );
}
