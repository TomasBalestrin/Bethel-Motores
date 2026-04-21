"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimeBR } from "@/lib/utils/format";
import type { AuditEntry } from "@/services/audit.service";
import { AuditDetailDrawer } from "./AuditDetailDrawer";

interface AuditTableProps {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  entityTypes: string[];
  users: { id: string; name: string | null; email: string }[];
  initial: {
    entityType?: string;
    userId?: string;
    from?: string;
    to?: string;
  };
}

export function AuditTable({
  entries,
  total,
  page,
  pageSize,
  entityTypes,
  users,
  initial,
}: AuditTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const entityOptions = useMemo(
    () => ["all", ...entityTypes],
    [entityTypes]
  );

  function pushParams(
    updates: Record<string, string | null>,
    { resetPage = true }: { resetPage?: boolean } = {}
  ) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Entity</Label>
          <Select
            value={initial.entityType ?? "all"}
            onValueChange={(value) =>
              pushParams({ entity_type: value === "all" ? null : value })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entityOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "all" ? "Todos" : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Usuário</Label>
          <Select
            value={initial.userId ?? "all"}
            onValueChange={(value) =>
              pushParams({ user_id: value === "all" ? null : value })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input
            type="date"
            defaultValue={initial.from ?? ""}
            onBlur={(event) =>
              pushParams({ from: event.target.value || null })
            }
            className="w-[150px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input
            type="date"
            defaultValue={initial.to ?? ""}
            onBlur={(event) => pushParams({ to: event.target.value || null })}
            className="w-[150px]"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Entity ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-sm text-muted-foreground"
                >
                  Nenhum registro de auditoria.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setSelected(entry)}
                >
                  <TableCell className="tabular-nums">
                    {formatDateTimeBR(entry.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full border-border text-[10px] capitalize"
                    >
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.entity_type}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.user_name ?? entry.user_email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <code className="text-[11px] text-muted-foreground">
                      {entry.entity_id ?? "—"}
                    </code>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <span>
          {total === 0
            ? "Nenhum registro"
            : `Exibindo ${rangeStart}–${rangeEnd} de ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() =>
              pushParams(
                { page: page - 1 <= 1 ? null : String(page - 1) },
                { resetPage: false }
              )
            }
          >
            Anterior
          </Button>
          <span className="tabular-nums">
            Página {page} / {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() =>
              pushParams(
                { page: String(page + 1) },
                { resetPage: false }
              )
            }
          >
            Próxima
          </Button>
        </div>
      </div>

      <AuditDetailDrawer
        entry={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
