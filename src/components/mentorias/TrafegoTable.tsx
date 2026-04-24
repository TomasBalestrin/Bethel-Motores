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
import type { TrafegoEntry, TrafegoPlatform } from "@/services/mentorias.service";

interface TrafegoTableProps {
  entries: TrafegoEntry[];
}

const PLATFORM_LABELS: Record<TrafegoPlatform, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok: "TikTok",
  youtube: "YouTube",
  outro: "Outro",
};

const PLATFORM_COLORS: Record<TrafegoPlatform, string> = {
  meta_ads: "border-blue-500/40 bg-blue-500/10 text-blue-600",
  google_ads: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  tiktok: "border-foreground/20 bg-foreground/10 text-foreground",
  youtube: "border-red-500/40 bg-red-500/10 text-red-600",
  outro: "border-border bg-muted text-muted-foreground",
};

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
            <TableHead>Plataforma</TableHead>
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
                {entry.platform ? (
                  <Badge
                    variant="outline"
                    className={`rounded-full text-[10px] ${
                      PLATFORM_COLORS[entry.platform]
                    }`}
                  >
                    {PLATFORM_LABELS[entry.platform]}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
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
