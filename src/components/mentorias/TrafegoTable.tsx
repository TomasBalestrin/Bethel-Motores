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
}

export function TrafegoTable({ entries }: TrafegoTableProps) {
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
            <TableHead>Origem</TableHead>
            <TableHead>Responsável</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="tabular-nums">
                {formatDateTimeBR(entry.captured_at)}
              </TableCell>
              <TableCell className="font-medium tabular-nums">
                {formatCurrency(entry.investimento_trafego)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="rounded-full border-border text-[10px] capitalize text-muted-foreground"
                >
                  {entry.source}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {entry.responsavel_nome ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
