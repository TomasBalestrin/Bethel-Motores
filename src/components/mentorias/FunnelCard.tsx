"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  PencilLine,
  Plug,
  User as UserIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { FunnelFieldValue, FunnelWithTemplate } from "@/types/funnel";
import type { FieldType, MetricSource } from "@/lib/validators/funnel";

interface FunnelCardProps {
  funnel: FunnelWithTemplate;
  onEdit: () => void;
}

function SourceIcon({ source }: { source: MetricSource }) {
  if (source === "webhook")
    return <Plug className="h-3 w-3 text-accent" aria-label="webhook" />;
  if (source === "api")
    return <Globe className="h-3 w-3 text-primary" aria-label="api" />;
  return (
    <UserIcon className="h-3 w-3 text-muted-foreground" aria-label="manual" />
  );
}

function formatFieldValue(
  fieldType: FieldType,
  current: FunnelFieldValue | undefined
): string {
  if (!current) return "—";
  if (fieldType === "url" || fieldType === "text") {
    return current.value_text ?? "—";
  }
  if (current.value_numeric == null) return "—";
  const value = Number(current.value_numeric);
  if (fieldType === "currency") return formatCurrency(value);
  if (fieldType === "percentage") return formatPercent(value);
  return value.toLocaleString("pt-BR");
}

export function FunnelCard({ funnel, onEdit }: FunnelCardProps) {
  const [expanded, setExpanded] = useState(true);

  const valueMap = useMemo(() => {
    const map = new Map<string, FunnelFieldValue>();
    for (const value of funnel.values) map.set(value.field_key, value);
    return map;
  }, [funnel.values]);

  const fields = funnel.template?.fields ?? [];

  return (
    <Card className="flex flex-col gap-3 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-semibold tracking-tight">
              {funnel.name}
            </h3>
            {funnel.is_traffic_funnel ? (
              <Badge
                variant="outline"
                className="rounded-full border-accent/30 bg-accent/10 text-[10px] text-accent"
              >
                Tráfego
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {funnel.template ? <span>{funnel.template.name}</span> : null}
            {funnel.list_url ? (
              <a
                href={funnel.list_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" aria-hidden /> Lista
              </a>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            aria-label="Editar indicadores"
          >
            <PencilLine className="mr-1 h-4 w-4" /> Editar indicadores
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={expanded ? "Recolher" : "Expandir"}
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {expanded ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {fields.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">
              Template sem campos configurados.
            </p>
          ) : (
            fields.map((field) => {
              const current = valueMap.get(field.field_key);
              const source = current?.source ?? field.default_source;
              return (
                <div
                  key={field.id}
                  className={cn(
                    "flex flex-col gap-1 rounded-md bg-muted/50 px-3 py-2"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </span>
                    <SourceIcon source={source} />
                  </div>
                  <span className="font-heading text-sm font-semibold tabular-nums">
                    {formatFieldValue(field.field_type, current)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </Card>
  );
}
