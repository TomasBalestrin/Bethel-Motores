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

interface Totals {
  volume: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  cost: number;
  errors: number;
  deliveryRate: number;
  costPerMessage: number;
  templateBreakdown: { template: string; count: number; cost: number }[];
}

function computeTotals(events: DisparoEvent[]): Totals {
  let volume = 0;
  let delivered = 0;
  let read = 0;
  let replied = 0;
  let failed = 0;
  let cost = 0;
  let errors = 0;
  const byTemplate = new Map<string, { count: number; cost: number }>();

  for (const event of events) {
    volume += event.volume_sent;
    delivered += event.volume_delivered;
    read += event.volume_read;
    replied += event.volume_replied;
    failed += event.volume_failed;
    cost += event.cost;
    if (event.status === "error") errors += 1;

    const tpl = event.template_name?.trim() || "—";
    const current = byTemplate.get(tpl) ?? { count: 0, cost: 0 };
    current.count += 1;
    current.cost += event.cost;
    byTemplate.set(tpl, current);
  }

  const deliveryRate = volume > 0 ? (delivered / volume) * 100 : 0;
  const costPerMessage = volume > 0 ? cost / volume : 0;

  const templateBreakdown = Array.from(byTemplate.entries())
    .map(([template, stats]) => ({ template, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    volume,
    delivered,
    read,
    replied,
    failed,
    cost,
    errors,
    deliveryRate,
    costPerMessage,
    templateBreakdown,
  };
}

export default async function DisparosPage({ params }: PageProps) {
  const supabase = await createClient();
  const events = await listDisparosByMentoria(supabase, params.mentoriaId).catch(
    () => [] as DisparoEvent[]
  );

  const t = computeTotals(events);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="space-y-1 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Volume enviado
          </p>
          <p className="font-heading text-xl font-semibold tabular-nums">
            {formatInteger(t.volume)}
          </p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Taxa de entrega
          </p>
          <p className="font-heading text-xl font-semibold tabular-nums">
            {t.deliveryRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatInteger(t.delivered)} entregues
          </p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Lidos / Respondidos
          </p>
          <p className="font-heading text-xl font-semibold tabular-nums">
            {formatInteger(t.read)}
            <span className="mx-1 text-muted-foreground">/</span>
            {formatInteger(t.replied)}
          </p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Custo total
          </p>
          <p className="font-heading text-xl font-semibold tabular-nums">
            {formatCurrency(t.cost)}
          </p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Custo médio / msg
          </p>
          <p className="font-heading text-xl font-semibold tabular-nums">
            {formatCurrency(t.costPerMessage)}
          </p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Falhas / Erros
          </p>
          <p className="font-heading text-xl font-semibold tabular-nums">
            {formatInteger(t.failed)}
            <span className="mx-1 text-muted-foreground">/</span>
            {t.errors}
          </p>
        </Card>
      </div>

      {t.templateBreakdown.length > 0 ? (
        <Card className="space-y-3 p-5">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Breakdown por template
          </h2>
          <div className="space-y-1.5">
            {t.templateBreakdown.map((row) => (
              <div
                key={row.template}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-xs"
              >
                <code className="truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  {row.template}
                </code>
                <span className="tabular-nums text-muted-foreground">
                  {row.count === 1 ? "1 disparo" : `${row.count} disparos`}
                </span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(row.cost)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

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
