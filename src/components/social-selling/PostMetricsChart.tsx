"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactNumber, formatDateBR } from "@/lib/utils/format";
import type { PostMetricsHistoryEntry } from "@/services/social-profiles.service";

interface PostMetricsChartProps {
  history: PostMetricsHistoryEntry[];
  metric?: keyof Pick<
    PostMetricsHistoryEntry,
    "impressions" | "reach" | "likes" | "clicks" | "spend"
  >;
}

export function PostMetricsChart({
  history,
  metric = "impressions",
}: PostMetricsChartProps) {
  const data = history.map((entry) => ({
    day: entry.captured_at.slice(0, 10),
    value: Number(entry[metric]),
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
        Sem histórico suficiente.
      </div>
    );
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10 }}
            tickFormatter={(value: string) => formatDateBR(value)}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(value: number) => formatCompactNumber(value)}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            formatter={(value) => [formatCompactNumber(Number(value ?? 0)), metric]}
            labelFormatter={(label) => formatDateBR(String(label))}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
