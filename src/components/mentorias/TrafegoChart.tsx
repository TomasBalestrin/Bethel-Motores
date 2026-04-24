"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";

import { formatCurrency, formatDateBR } from "@/lib/utils/format";
import type {
  TrafegoEntry,
  TrafegoPlatform,
} from "@/services/mentorias.service";

interface TrafegoChartProps {
  entries: TrafegoEntry[];
}

const PLATFORM_ORDER: TrafegoPlatform[] = [
  "meta_ads",
  "google_ads",
  "tiktok",
  "youtube",
  "outro",
];

const PLATFORM_LABELS: Record<TrafegoPlatform, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok: "TikTok",
  youtube: "YouTube",
  outro: "Outro",
};

const PLATFORM_FILL: Record<TrafegoPlatform, string> = {
  meta_ads: "#1877F2",
  google_ads: "#F59E0B",
  tiktok: "#111827",
  youtube: "#EF4444",
  outro: "#94A3B8",
};

type ChartRow = { day: string } & Record<TrafegoPlatform, number>;

function aggregateByDayAndPlatform(entries: TrafegoEntry[]): ChartRow[] {
  const byDay = new Map<string, ChartRow>();
  for (const entry of entries) {
    const day = entry.captured_at.slice(0, 10);
    if (!byDay.has(day)) {
      byDay.set(day, {
        day,
        meta_ads: 0,
        google_ads: 0,
        tiktok: 0,
        youtube: 0,
        outro: 0,
      });
    }
    const platform: TrafegoPlatform = entry.platform ?? "outro";
    const row = byDay.get(day)!;
    row[platform] += entry.investimento_trafego;
  }
  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
}

export function TrafegoChart({ entries }: TrafegoChartProps) {
  const data = useMemo(() => aggregateByDayAndPlatform(entries), [entries]);

  const activePlatforms = useMemo(() => {
    const used = new Set<TrafegoPlatform>();
    for (const row of data) {
      for (const p of PLATFORM_ORDER) {
        if (row[p] > 0) used.add(p);
      }
    }
    return PLATFORM_ORDER.filter((p) => used.has(p));
  }, [data]);

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
            formatter={(value, name) => [
              formatCurrency(Number(value ?? 0)),
              PLATFORM_LABELS[name as TrafegoPlatform] ?? String(name),
            ]}
            labelFormatter={(label) => formatDateBR(String(label))}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) =>
              PLATFORM_LABELS[value as TrafegoPlatform] ?? value
            }
          />
          {activePlatforms.map((platform) => (
            <Bar
              key={platform}
              dataKey={platform}
              stackId="platform"
              fill={PLATFORM_FILL[platform]}
              radius={0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
