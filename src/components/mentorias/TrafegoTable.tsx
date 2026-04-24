import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTimeBR } from "@/lib/utils/format";
import type { TrafegoEntry } from "@/services/mentorias.service";

interface TrafegoTableProps {
  entries: TrafegoEntry[];
  creativeById?: Record<string, { code: string; format: "video" | "static" }>;
}

export function TrafegoTable({ entries, creativeById = {} }: TrafegoTableProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhum investimento registrado.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Criativo</TableHead>
            <TableHead>Responsável</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const creative = entry.creative_id
              ? creativeById[entry.creative_id]
              : null;
            return (
              <TableRow key={entry.id}>
                <TableCell className="tabular-nums">
                  {formatDateTimeBR(entry.captured_at)}
                </TableCell>
                <TableCell className="font-medium tabular-nums">
                  {formatCurrency(entry.investimento_trafego)}
                </TableCell>
                <TableCell>
                  {creative ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-border text-[10px]"
                    >
                      {creative.code} ·{" "}
                      {creative.format === "video" ? "Vídeo" : "Estático"}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {entry.responsavel_nome ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
