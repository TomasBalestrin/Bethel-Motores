"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";

import { formatCurrency, formatDateBR } from "@/lib/utils/format";
import type { TrafegoEntry } from "@/services/mentorias.service";

interface TrafegoChartProps {
  entries: TrafegoEntry[];
}

type ChartRow = { day: string; value: number };

function aggregateByDay(entries: TrafegoEntry[]): ChartRow[] {
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const day = entry.captured_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + entry.investimento_trafego);
  }
  return Array.from(byDay.entries())
    .map(([day, value]) => ({ day, value }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export function TrafegoChart({ entries }: TrafegoChartProps) {
  const data = useMemo(() => aggregateByDay(entries), [entries]);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
        Sem dados para o gráfico.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tickFormatter={(day: string) => formatDateBR(day)}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tickFormatter={(value: number) =>
              new Intl.NumberFormat("pt-BR", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(value)
            }
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            formatter={(value) => [
              formatCurrency(Number(value ?? 0)),
              "Investimento",
            ]}
            labelFormatter={(label) => formatDateBR(String(label))}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
