"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Download } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatInteger,
  formatPercent,
} from "@/lib/utils/format";
import { calcDelta } from "@/lib/utils/calc";
import type { MentoriaWithMetrics } from "@/types/mentoria";

interface CompareDiffTableProps {
  mentorias: MentoriaWithMetrics[];
}

type MetricFormat = "integer" | "currency" | "percent";

interface MetricRow {
  key: string;
  label: string;
  format: MetricFormat;
  read: (mentoria: MentoriaWithMetrics) => number;
}

const METRIC_ROWS: MetricRow[] = [
  { key: "leads_grupo", label: "Leads no Grupo", format: "integer", read: (m) => m.leads_grupo },
  { key: "leads_ao_vivo", label: "Leads Ao Vivo", format: "integer", read: (m) => m.leads_ao_vivo },
  { key: "agendamentos", label: "Agendamentos", format: "integer", read: (m) => m.agendamentos },
  { key: "calls_realizadas", label: "Calls Realizadas", format: "integer", read: (m) => m.calls_realizadas },
  { key: "vendas", label: "Vendas", format: "integer", read: (m) => m.vendas },
  { key: "valor_vendas", label: "Valor em Venda", format: "currency", read: (m) => m.valor_vendas },
  { key: "valor_entrada", label: "Valor de Entrada", format: "currency", read: (m) => m.valor_entrada },
  {
    key: "investimento_total",
    label: "Investimento Total",
    format: "currency",
    read: (m) => m.investimento_trafego + m.investimento_api,
  },
  { key: "pct_comparecimento", label: "% Comparecimento", format: "percent", read: (m) => m.pct_comparecimento },
  { key: "pct_agendamento", label: "% Agendamento", format: "percent", read: (m) => m.pct_agendamento },
  { key: "pct_comparecimento_call", label: "% Comparecimento Call", format: "percent", read: (m) => m.pct_comparecimento_call },
  { key: "pct_conversao_call", label: "% Conversão Call", format: "percent", read: (m) => m.pct_conversao_call },
];

function formatValue(value: number, format: MetricFormat): string {
  if (format === "currency") return formatCurrency(value);
  if (format === "percent") return formatPercent(value);
  return formatInteger(value);
}

function escapeCsv(cell: string): string {
  if (/[",\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function CompareDiffTable({ mentorias }: CompareDiffTableProps) {
  const base = mentorias[0];

  const rows = useMemo(() => {
    if (!base) return [];
    return METRIC_ROWS.map((metric) => {
      const baseValue = metric.read(base);
      return {
        metric,
        values: mentorias.map((mentoria) => metric.read(mentoria)),
        deltas: mentorias.slice(1).map((mentoria) =>
          calcDelta(metric.read(mentoria), baseValue)
        ),
      };
    });
  }, [mentorias, base]);

  if (!base || mentorias.length < 2) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Selecione no mínimo 2 mentorias para ver a tabela de variação.
      </p>
    );
  }

  function exportCsv() {
    const headerCells = ["Métrica", ...mentorias.map((m) => m.name)];
    if (mentorias.length > 1) {
      headerCells.push(`Variação % vs ${mentorias[0]!.name}`);
    }
    const lines: string[] = [];
    lines.push(headerCells.map(escapeCsv).join(","));

    for (const row of rows) {
      const cells = [row.metric.label];
      for (const value of row.values) {
        cells.push(formatValue(value, row.metric.format));
      }
      if (row.deltas.length > 0) {
        const deltaText = row.deltas
          .map((delta) => `${delta.value > 0 ? "+" : ""}${delta.value.toFixed(1)}%`)
          .join(" / ");
        cells.push(deltaText);
      }
      lines.push(cells.map(escapeCsv).join(","));
    }

    const blob = new Blob([`﻿${lines.join("\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparar-mentorias-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">Variação por métrica</h2>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="mr-1 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Métrica</TableHead>
              {mentorias.map((mentoria, index) => (
                <TableHead key={mentoria.id} className="text-right">
                  {mentoria.name}
                  {index === 0 ? (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      (base)
                    </span>
                  ) : null}
                </TableHead>
              ))}
              {mentorias.length > 1 ? (
                <TableHead className="text-right">Variação %</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.metric.key}>
                <TableCell className="font-medium">{row.metric.label}</TableCell>
                {row.values.map((value, index) => (
                  <TableCell
                    key={`${row.metric.key}-${mentorias[index]!.id}`}
                    className="text-right tabular-nums"
                  >
                    {formatValue(value, row.metric.format)}
                  </TableCell>
                ))}
                {row.deltas.length > 0 ? (
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      {row.deltas.map((delta, idx) => {
                        const Icon =
                          delta.direction === "up"
                            ? ArrowUp
                            : delta.direction === "down"
                              ? ArrowDown
                              : ArrowRight;
                        return (
                          <span
                            key={`delta-${row.metric.key}-${idx}`}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              delta.direction === "up" &&
                                "bg-success/10 text-success",
                              delta.direction === "down" &&
                                "bg-destructive/10 text-destructive",
                              delta.direction === "flat" &&
                                "bg-muted text-muted-foreground"
                            )}
                          >
                            <Icon className="h-3 w-3" aria-hidden />
                            {delta.value > 0 ? "+" : ""}
                            {delta.value.toFixed(1)}%
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
