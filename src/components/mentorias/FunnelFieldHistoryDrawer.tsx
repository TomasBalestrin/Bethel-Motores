"use client";

import { useEffect, useState } from "react";
import { Globe, ListChecks, Loader2, Plug, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTimeBR, formatPercent } from "@/lib/utils/format";
import type { FieldType, MetricSource } from "@/lib/validators/funnel";

interface HistoryEntry {
  field_key: string;
  value_numeric: number | null;
  value_text: string | null;
  source: MetricSource;
  source_ref: string | null;
  captured_by: string | null;
  captured_at: string;
}

interface FunnelFieldHistoryDrawerProps {
  funnelId: string | null;
  fieldKey: string | null;
  fieldLabel?: string | null;
  fieldType?: FieldType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_ICON: Record<MetricSource, typeof UserIcon> = {
  manual: UserIcon,
  webhook: Plug,
  api: Globe,
  derived: ListChecks,
};

function formatValue(
  fieldType: FieldType | undefined,
  entry: HistoryEntry
): string {
  if (fieldType === "url" || fieldType === "text") {
    return entry.value_text ?? "—";
  }
  if (entry.value_numeric == null) return "—";
  const n = Number(entry.value_numeric);
  if (fieldType === "currency") return formatCurrency(n);
  if (fieldType === "percentage") return formatPercent(n);
  return n.toLocaleString("pt-BR");
}

export function FunnelFieldHistoryDrawer({
  funnelId,
  fieldKey,
  fieldLabel,
  fieldType,
  open,
  onOpenChange,
}: FunnelFieldHistoryDrawerProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !funnelId || !fieldKey) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/funnels/${funnelId}/history?field=${encodeURIComponent(fieldKey)}&limit=100`
    )
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            typeof body?.error === "string" ? body.error : "Erro ao carregar"
          );
        }
        return response.json() as Promise<{ data: HistoryEntry[] }>;
      })
      .then((payload) => {
        if (!cancelled) setEntries(payload.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, funnelId, fieldKey]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>
            Histórico · {fieldLabel ?? fieldKey ?? ""}
          </DrawerTitle>
          <DrawerDescription>
            Snapshots mais recentes primeiro, limitado a 100 registros.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-3 text-sm">
          {loading ? (
            <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          ) : entries.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Nenhum snapshot para este campo.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry, index) => {
                const Icon = SOURCE_ICON[entry.source] ?? UserIcon;
                return (
                  <li
                    key={`${entry.captured_at}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                      <Badge
                        variant="outline"
                        className="rounded-full border-border text-[10px] capitalize"
                      >
                        {entry.source}
                      </Badge>
                      <span className="text-muted-foreground">
                        {formatDateTimeBR(entry.captured_at)}
                      </span>
                    </div>
                    <span className="font-heading text-sm font-semibold tabular-nums">
                      {formatValue(fieldType, entry)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full">
              Fechar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
