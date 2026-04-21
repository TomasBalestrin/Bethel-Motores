"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

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
import { cn } from "@/lib/utils";
import { formatDateTimeBR } from "@/lib/utils/format";
import type { DisparoEvent } from "@/services/mentorias.service";

interface DisparoEventDrawerProps {
  event: DisparoEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CLASSES: Record<DisparoEvent["status"], string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  processed: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  skipped: "bg-muted text-muted-foreground border-border",
};

export function DisparoEventDrawer({
  event,
  open,
  onOpenChange,
}: DisparoEventDrawerProps) {
  const router = useRouter();
  const [reprocessing, setReprocessing] = useState(false);

  if (!event) return null;

  async function handleReprocess() {
    setReprocessing(true);
    try {
      const response = await fetch(
        `/api/integrations/events/${event!.id}/reprocess`,
        { method: "POST" }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Erro ao reprocessar");
      }
      toast.success("Evento marcado para reprocessamento");
      router.refresh();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível reprocessar", { description: message });
    } finally {
      setReprocessing(false);
    }
  }

  const payloadString = JSON.stringify(event.payload, null, 2);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            Evento Fluxon
            <Badge
              variant="outline"
              className={cn(
                "rounded-full border text-[11px] capitalize",
                STATUS_CLASSES[event.status]
              )}
            >
              {event.status}
            </Badge>
          </DrawerTitle>
          <DrawerDescription>
            Recebido em {formatDateTimeBR(event.received_at)}
            {event.processed_at
              ? ` · Processado em ${formatDateTimeBR(event.processed_at)}`
              : ""}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 text-sm">
          <dl className="grid grid-cols-2 gap-2">
            <div>
              <dt className="text-xs text-muted-foreground">Source ID externo</dt>
              <dd className="font-mono text-xs">
                {event.source_event_id ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Funil</dt>
              <dd>{event.funnel_label ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Volume enviado</dt>
              <dd className="font-medium tabular-nums">{event.volume_sent}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Volume entregue</dt>
              <dd className="font-medium tabular-nums">
                {event.volume_delivered}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Custo</dt>
              <dd className="font-medium tabular-nums">
                {event.cost.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </dd>
            </div>
          </dl>

          {event.error_message ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {event.error_message}
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payload bruto
            </p>
            <pre className="max-h-[40vh] overflow-auto rounded-md border border-border bg-muted/50 p-3 text-xs leading-relaxed">
              <code>{payloadString}</code>
            </pre>
          </div>
        </div>

        <DrawerFooter className="flex-row justify-end gap-2">
          <DrawerClose asChild>
            <Button variant="ghost" disabled={reprocessing}>
              Fechar
            </Button>
          </DrawerClose>
          <Button onClick={handleReprocess} disabled={reprocessing}>
            {reprocessing ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Reprocessando...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-1 h-4 w-4" />
                Reprocessar
              </>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
