import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSourceWithRecentEvents } from "@/services/integrations.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MappingEditor } from "@/components/integrations/MappingEditor";
import { formatDateTimeBR } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { sourceId: string };
}

function collectPaths(
  value: unknown,
  prefix = "",
  bucket = new Set<string>(),
  depth = 0
): Set<string> {
  if (depth > 4 || value == null || typeof value !== "object") return bucket;
  if (Array.isArray(value)) {
    if (value.length > 0) collectPaths(value[0], prefix, bucket, depth + 1);
    return bucket;
  }
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    bucket.add(next);
    collectPaths(inner, next, bucket, depth + 1);
  }
  return bucket;
}

const STATUS_CLASSES = {
  pending: "bg-warning/10 text-warning border-warning/20",
  processed: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  skipped: "bg-muted text-muted-foreground border-border",
};

export default async function IntegrationSourceDetailPage({ params }: PageProps) {
  const supabase = await createClient();
  const source = await getSourceWithRecentEvents(supabase, params.sourceId);
  if (!source) {
    notFound();
  }

  const samplePayload = source.recent_events[0]?.payload ?? null;
  const detectedPaths = samplePayload
    ? Array.from(collectPaths(samplePayload))
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/settings/integrations">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para integrações
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {source.name}
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <code>{source.slug}</code>
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/10 text-[10px] text-primary"
            >
              {source.type}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full border text-[10px]",
                source.is_active
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {source.is_active ? "Ativa" : "Inativa"}
            </Badge>
          </div>
        </div>
      </header>

      <Card className="space-y-2 p-5">
        <h2 className="font-heading text-base font-semibold">
          Últimos eventos ({source.recent_events.length})
        </h2>
        {source.recent_events.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum evento recebido ainda.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {source.recent_events.map((event) => (
              <li
                key={event.id}
                className="rounded-md border border-border bg-card px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {event.source_event_id ?? event.id.slice(0, 8)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border text-[10px] capitalize",
                        STATUS_CLASSES[event.status]
                      )}
                    >
                      {event.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTimeBR(event.received_at)}
                    </span>
                  </div>
                </div>
                {event.error_message ? (
                  <p className="mt-1 text-xs text-destructive">
                    {event.error_message}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <MappingEditor
        sourceId={source.id}
        initialMapping={source.mapping}
        samplePayload={
          samplePayload && typeof samplePayload === "object"
            ? (samplePayload as Record<string, unknown>)
            : undefined
        }
        detectedPaths={detectedPaths}
      />
    </div>
  );
}
