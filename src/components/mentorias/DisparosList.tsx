"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTimeBR, formatInteger } from "@/lib/utils/format";
import type { DisparoEvent } from "@/services/mentorias.service";
import { DisparoEventDrawer } from "./DisparoEventDrawer";

interface DisparosListProps {
  events: DisparoEvent[];
}

const STATUS_LABEL: Record<DisparoEvent["status"], string> = {
  pending: "Pendente",
  processed: "Processado",
  error: "Erro",
  skipped: "Ignorado",
};

const STATUS_CLASSES: Record<DisparoEvent["status"], string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  processed: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  skipped: "bg-muted text-muted-foreground border-border",
};

export function DisparosList({ events }: DisparosListProps) {
  const [selected, setSelected] = useState<DisparoEvent | null>(null);

  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhum disparo registrado para esta mentoria.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Funil</TableHead>
              <TableHead className="text-right">Enviado</TableHead>
              <TableHead className="text-right">Entregue</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow
                key={event.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => setSelected(event)}
              >
                <TableCell className="tabular-nums">
                  {formatDateTimeBR(event.received_at)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {event.funnel_label ?? "—"}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatInteger(event.volume_sent)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(event.volume_delivered)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(event.cost)}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border text-[10px]",
                        STATUS_CLASSES[event.status]
                      )}
                    >
                      {STATUS_LABEL[event.status]}
                    </Badge>
                    {event.status === "error" ? (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    ) : null}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DisparoEventDrawer
        event={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
