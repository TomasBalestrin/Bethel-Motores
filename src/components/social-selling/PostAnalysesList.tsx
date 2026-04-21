"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Globe, Loader2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeBR } from "@/lib/utils/format";

interface AnalysisEntry {
  id: string;
  source: "file" | "link" | "text";
  file_url: string | null;
  file_name: string | null;
  link: string | null;
  note: string | null;
  content_text: string | null;
  author_name: string | null;
  created_at: string;
  signed_url?: string | null;
}

interface PostAnalysesListProps {
  postId: string;
}

const SOURCE_LABELS = {
  file: "Arquivo",
  link: "Link",
  text: "Texto",
} as const;

const SOURCE_ICONS = {
  file: FileText,
  link: Globe,
  text: FileText,
} as const;

export function PostAnalysesList({ postId }: PostAnalysesListProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/posts/${postId}/analyses`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            typeof body?.error === "string" ? body.error : "Erro ao carregar"
          );
        }
        return response.json() as Promise<{ data: AnalysisEntry[] }>;
      })
      .then((payload) => {
        if (!cancelled) setEntries(payload.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Carregando análises...
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
        {error}
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Nenhuma análise registrada.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => {
        const SourceIcon = SOURCE_ICONS[entry.source];
        return (
          <li
            key={entry.id}
            className="space-y-2 rounded-md border border-border bg-card p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/10 text-[10px] text-primary"
              >
                <SourceIcon className="mr-1 h-3 w-3" />
                {SOURCE_LABELS[entry.source]}
              </Badge>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <User className="h-3 w-3" />
                {entry.author_name ?? "—"}
                <span className="mx-1">·</span>
                {formatDateTimeBR(entry.created_at)}
              </span>
            </div>

            {entry.source === "file" ? (
              <div className="text-xs">
                {entry.signed_url ? (
                  <Link
                    href={entry.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {entry.file_name ?? "Baixar arquivo"}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    {entry.file_name ?? "Arquivo indisponível"}
                  </span>
                )}
              </div>
            ) : null}

            {entry.source === "link" ? (
              <div className="space-y-1 text-xs">
                {entry.link ? (
                  <Link
                    href={entry.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {entry.link}
                  </Link>
                ) : null}
                {entry.note ? (
                  <p className="text-muted-foreground">{entry.note}</p>
                ) : null}
              </div>
            ) : null}

            {entry.source === "text" && entry.content_text ? (
              <div
                className={cn(
                  "prose prose-sm max-w-none text-sm",
                  "prose-headings:font-heading prose-headings:font-semibold",
                  "prose-a:text-primary"
                )}
              >
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {entry.content_text}
                </ReactMarkdown>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
