"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCompactNumber,
  formatCurrency,
  formatDateTimeBR,
} from "@/lib/utils/format";
import { listPostMetricsHistory } from "@/services/social-profiles.service";
import type {
  PostMetricsHistoryEntry,
  ProfilePost,
} from "@/services/social-profiles.service";
import { PostAnalysesList } from "./PostAnalysesList";

const PostMetricsChart = dynamic(
  () =>
    import("./PostMetricsChart").then((mod) => ({
      default: mod.PostMetricsChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
        <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Carregando chart...
      </div>
    ),
  }
);

interface PostDetailModalProps {
  post: ProfilePost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ChartMetric = "impressions" | "reach" | "likes" | "clicks" | "spend";

const METRIC_OPTIONS: { value: ChartMetric; label: string }[] = [
  { value: "impressions", label: "Impressões" },
  { value: "reach", label: "Alcance" },
  { value: "likes", label: "Likes" },
  { value: "clicks", label: "Clicks" },
  { value: "spend", label: "Gasto" },
];

export function PostDetailModal({
  post,
  open,
  onOpenChange,
}: PostDetailModalProps) {
  const [history, setHistory] = useState<PostMetricsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<ChartMetric>("impressions");

  useEffect(() => {
    if (!open || !post) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    listPostMetricsHistory(supabase, post.id, 30)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, post]);

  if (!post) return null;
  const latest = post.latest_metrics;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {post.code}
            {post.link ? (
              <a
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Instagram
              </a>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {latest
              ? `Última métrica em ${formatDateTimeBR(latest.captured_at)}`
              : "Nenhuma métrica registrada"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricTile label="Impressões" value={latest?.impressions ?? 0} />
          <MetricTile label="Alcance" value={latest?.reach ?? 0} />
          <MetricTile label="Likes" value={latest?.likes ?? 0} />
          <MetricTile label="Comentários" value={latest?.comments ?? 0} />
          <MetricTile label="Compartilhamentos" value={latest?.shares ?? 0} />
          <MetricTile label="Salvos" value={latest?.saves ?? 0} />
          <MetricTile label="Clicks" value={latest?.clicks ?? 0} />
          <MetricTile
            label="Gasto"
            value={latest?.spend ?? 0}
            format="currency"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Histórico
            </p>
            <Select
              value={metric}
              onValueChange={(value) => setMetric(value as ChartMetric)}
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <PostMetricsChart history={history} metric={metric} />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Análises
          </p>
          <PostAnalysesList postId={post.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MetricTileProps {
  label: string;
  value: number;
  format?: "compact" | "currency";
}

function MetricTile({ label, value, format = "compact" }: MetricTileProps) {
  const display =
    format === "currency" ? formatCurrency(value) : formatCompactNumber(value);
  return (
    <div className="flex flex-col rounded-md bg-muted/40 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-heading text-sm font-semibold tabular-nums">
        {display}
      </span>
    </div>
  );
}
