"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTimeBR } from "@/lib/utils/format";
import type { AuditEntry } from "@/services/audit.service";

interface AuditDetailDrawerProps {
  entry: AuditEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DiffRow = {
  key: string;
  before: unknown;
  after: unknown;
  status: "added" | "removed" | "changed" | "unchanged";
};

function buildDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): DiffRow[] {
  const keys = new Set<string>();
  if (before) Object.keys(before).forEach((key) => keys.add(key));
  if (after) Object.keys(after).forEach((key) => keys.add(key));

  const rows: DiffRow[] = [];
  for (const key of Array.from(keys).sort()) {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    const beforeMissing = before ? !(key in before) : true;
    const afterMissing = after ? !(key in after) : true;

    let status: DiffRow["status"];
    if (beforeMissing && !afterMissing) status = "added";
    else if (!beforeMissing && afterMissing) status = "removed";
    else if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue))
      status = "changed";
    else status = "unchanged";

    rows.push({ key, before: beforeValue, after: afterValue, status });
  }
  return rows;
}

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function AuditDetailDrawer({
  entry,
  open,
  onOpenChange,
}: AuditDetailDrawerProps) {
  const diff = useMemo(() => {
    if (!entry?.changes) return [];
    return buildDiff(entry.changes.before ?? null, entry.changes.after ?? null);
  }, [entry]);

  if (!entry) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/10 text-[10px] text-primary"
            >
              {entry.action}
            </Badge>
            {entry.entity_type}
          </DrawerTitle>
          <DrawerDescription>
            {formatDateTimeBR(entry.created_at)} ·{" "}
            {entry.user_name ?? entry.user_email ?? "Sistema"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 text-sm">
          <section className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-3 text-xs">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Entity
              </p>
              <p className="font-medium">{entry.entity_type}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Entity ID
              </p>
              <code className="text-[11px]">{entry.entity_id ?? "—"}</code>
            </div>
          </section>

          {diff.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Sem diff registrado.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left">Campo</th>
                    <th className="px-2 py-1 text-left">Antes</th>
                    <th className="px-2 py-1 text-left">Depois</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.map((row) => (
                    <tr
                      key={row.key}
                      className={cn(
                        "border-t border-border",
                        row.status === "added" && "bg-success/10",
                        row.status === "removed" && "bg-destructive/10",
                        row.status === "changed" && "bg-warning/10"
                      )}
                    >
                      <td className="px-2 py-1 font-mono text-[11px]">
                        {row.key}
                      </td>
                      <td className="px-2 py-1 font-mono text-[11px] text-destructive">
                        {row.status === "added" ? "—" : formatValue(row.before)}
                      </td>
                      <td className="px-2 py-1 font-mono text-[11px] text-success">
                        {row.status === "removed" ? "—" : formatValue(row.after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {entry.changes?.meta ? (
            <div>
              <p className="mb-1 text-[10px] uppercase text-muted-foreground">
                Meta
              </p>
              <pre className="overflow-x-auto rounded-md bg-muted/40 p-2 text-[11px]">
                <code>{JSON.stringify(entry.changes.meta, null, 2)}</code>
              </pre>
            </div>
          ) : null}
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
