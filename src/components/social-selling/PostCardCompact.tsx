"use client";

import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatCompactNumber, formatDateBR } from "@/lib/utils/format";
import type { ProfilePost } from "@/services/social-profiles.service";

interface PostCardCompactProps {
  post: ProfilePost;
  onClick?: () => void;
}

export function PostCardCompact({ post, onClick }: PostCardCompactProps) {
  const metrics = post.latest_metrics;
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-heading text-sm font-semibold">{post.code}</p>
          <p className="text-[10px] text-muted-foreground">
            {formatDateBR(post.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {post.is_fit ? (
            <Badge
              variant="outline"
              className="rounded-full border-success/30 bg-success/10 text-[10px] text-success"
            >
              Fit
            </Badge>
          ) : null}
          {post.is_test ? (
            <Badge
              variant="outline"
              className="rounded-full border-warning/30 bg-warning/10 text-[10px] text-warning"
            >
              Teste
            </Badge>
          ) : null}
          {!post.is_active ? (
            <Badge
              variant="outline"
              className="rounded-full border-border bg-muted text-[10px] text-muted-foreground"
            >
              Pausado
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col rounded-md bg-muted/50 px-2 py-1">
          <span className="text-[10px] uppercase text-muted-foreground">
            Impressões
          </span>
          <span className="font-heading text-sm font-semibold tabular-nums">
            {formatCompactNumber(metrics?.impressions ?? 0)}
          </span>
        </div>
        <div className="flex flex-col rounded-md bg-muted/50 px-2 py-1">
          <span className="text-[10px] uppercase text-muted-foreground">
            Alcance
          </span>
          <span className="font-heading text-sm font-semibold tabular-nums">
            {formatCompactNumber(metrics?.reach ?? 0)}
          </span>
        </div>
        <div className="flex flex-col rounded-md bg-muted/50 px-2 py-1">
          <span className="text-[10px] uppercase text-muted-foreground">
            Clicks
          </span>
          <span className="font-heading text-sm font-semibold tabular-nums">
            {formatCompactNumber(metrics?.clicks ?? 0)}
          </span>
        </div>
        <div className="flex flex-col rounded-md bg-muted/50 px-2 py-1">
          <span className="text-[10px] uppercase text-muted-foreground">
            Gasto
          </span>
          <span className="font-heading text-sm font-semibold tabular-nums">
            {formatCurrency(metrics?.spend ?? 0)}
          </span>
        </div>
      </div>

      {post.link ? (
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1 self-start text-[11px] text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Ver no Instagram
        </a>
      ) : null}
    </Card>
  );
}
