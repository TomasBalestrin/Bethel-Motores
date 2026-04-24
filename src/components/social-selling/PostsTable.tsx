"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ExternalLink, FileText, Gauge, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCompactNumber,
  formatCurrency,
  formatDateBR,
} from "@/lib/utils/format";
import type { ProfilePost } from "@/services/social-profiles.service";
import type { PostType } from "@/types/post";
import { useDebounce } from "@/hooks/useDebounce";
import { PostMetricsDrawer } from "./PostMetricsDrawer";
import { PostAnalysisDrawer } from "./PostAnalysisDrawer";
import { PostDetailsModal } from "./PostDetailsModal";

type Filter = "all" | "fit" | "test";

interface PostsTableProps {
  posts: ProfilePost[];
  postType: PostType;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function costPerFollower(
  investment: number | null | undefined,
  followers: number | null | undefined
): number | null {
  if (!investment || !followers) return null;
  return investment / followers;
}

function formatCostSmall(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PostsTable({ posts, postType }: PostsTableProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [optimistic, setOptimistic] = useState<Record<string, Partial<ProfilePost>>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const [metricsTarget, setMetricsTarget] = useState<ProfilePost | null>(null);
  const [analysisTarget, setAnalysisTarget] = useState<ProfilePost | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<ProfilePost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfilePost | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setOptimistic({});
    setDeletedIds(new Set());
  }, [posts]);

  const decorated = useMemo(
    () =>
      posts
        .filter((post) => !deletedIds.has(post.id))
        .map((post) => ({
          ...post,
          ...(optimistic[post.id] ?? {}),
        })),
    [posts, optimistic, deletedIds]
  );

  const debouncedQuery = useDebounce(query, 250);

  const filtered = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    return decorated.filter((post) => {
      if (filter === "fit" && !post.is_fit) return false;
      if (filter === "test" && !post.is_test) return false;
      if (!term) return true;
      return (
        post.code.toLowerCase().includes(term) ||
        (post.link ?? "").toLowerCase().includes(term)
      );
    });
  }, [decorated, debouncedQuery, filter]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const response = await fetch(`/api/posts/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao excluir"
        );
      }
      toast.success("Post excluído");
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.add(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível excluir", { description: message });
    } finally {
      setDeleteBusy(false);
    }
  }

  async function patch(post: ProfilePost, body: Partial<ProfilePost>) {
    setOptimistic((prev) => ({
      ...prev,
      [post.id]: { ...(prev[post.id] ?? {}), ...body },
    }));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "Erro ao atualizar"
          );
        }
        // Estado otimista já reflete o valor salvo — não precisa router.refresh().
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro desconhecido";
        toast.error("Não foi possível atualizar", { description: message });
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[post.id];
          return next;
        });
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por código ou link"
            className="pl-8"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="fit">Fit</SelectItem>
            <SelectItem value="test">Em teste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Código</TableHead>
              <TableHead className="min-w-[180px]">Headline</TableHead>
              <TableHead className="w-[60px] text-center">Link</TableHead>
              {postType === "impulsionar" ? (
                <>
                  <TableHead className="w-[100px] text-right">
                    Investido
                  </TableHead>
                  <TableHead className="w-[80px] text-right">
                    Seguid.
                  </TableHead>
                  <TableHead className="w-[80px] text-right">
                    Custo/seg
                  </TableHead>
                  <TableHead className="w-[70px] text-right">Hook</TableHead>
                  <TableHead className="w-[70px] text-right">
                    Hold 50
                  </TableHead>
                  <TableHead className="w-[70px] text-right">
                    Hold 75
                  </TableHead>
                  <TableHead className="w-[70px] text-right">
                    Duração
                  </TableHead>
                </>
              ) : (
                <>
                  <TableHead className="w-[80px] text-right">
                    Seguid.
                  </TableHead>
                  <TableHead className="w-[80px] text-right">
                    Alcance
                  </TableHead>
                  <TableHead className="w-[80px] text-right">
                    Curtidas
                  </TableHead>
                  <TableHead className="w-[80px] text-right">
                    Coment.
                  </TableHead>
                  <TableHead className="w-[70px] text-right">Shares</TableHead>
                  <TableHead className="w-[70px] text-right">
                    Duração
                  </TableHead>
                </>
              )}
              <TableHead className="w-[130px] text-center">Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={postType === "impulsionar" ? 12 : 11}
                  className="text-center text-sm text-muted-foreground"
                >
                  Nenhum post corresponde aos filtros.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((post) => (
                <TableRow
                  key={post.id}
                  onClick={() => setDetailsTarget(post)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="align-top">
                    <div className="flex flex-col">
                      <span className="font-medium">{post.code}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {post.posted_at
                          ? formatDateBR(post.posted_at)
                          : formatDateBR(post.created_at)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className="align-top"
                    title={post.headline ?? ""}
                  >
                    <span className="line-clamp-2 text-xs leading-tight">
                      {post.headline ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-center align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.link ? (
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir no Instagram"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-muted"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {postType === "impulsionar" ? (
                    <>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatCurrency(
                          post.latest_metrics?.investment ?? 0
                        )}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatCompactNumber(
                          post.latest_metrics?.followers_gained ?? 0
                        )}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {(() => {
                          const cpf = costPerFollower(
                            post.latest_metrics?.investment,
                            post.latest_metrics?.followers_gained
                          );
                          return cpf !== null ? formatCostSmall(cpf) : "—";
                        })()}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatPercent(post.latest_metrics?.hook_rate_3s)}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatPercent(post.latest_metrics?.hold_50)}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatPercent(post.latest_metrics?.hold_75)}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatDuration(
                          post.latest_metrics?.duration_seconds
                        )}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatCompactNumber(
                          post.latest_metrics?.followers_gained ?? 0
                        )}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatCompactNumber(post.latest_metrics?.reach ?? 0)}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatCompactNumber(post.latest_metrics?.likes ?? 0)}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatCompactNumber(
                          post.latest_metrics?.comments ?? 0
                        )}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatCompactNumber(post.latest_metrics?.shares ?? 0)}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {formatDuration(
                          post.latest_metrics?.duration_seconds
                        )}
                      </TableCell>
                    </>
                  )}
                  <TableCell
                    className="align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={post.is_test ? "Remover teste" : "Marcar teste"}
                        title={post.is_test ? "Em teste" : "Marcar como em teste"}
                        onClick={() => patch(post, { is_test: !post.is_test })}
                      >
                        <span
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                            post.is_test
                              ? "bg-warning text-warning-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          T
                        </span>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={post.is_active ? "Pausar" : "Ativar"}
                        title={post.is_active ? "Ativo" : "Pausado"}
                        onClick={() =>
                          patch(post, { is_active: !post.is_active })
                        }
                      >
                        <span
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                            post.is_active
                              ? "bg-success text-success-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          A
                        </span>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={post.is_fit ? "Remover fit" : "Marcar fit"}
                        title={post.is_fit ? "Fit" : "Marcar como fit"}
                        onClick={() => patch(post, { is_fit: !post.is_fit })}
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            post.is_fit
                              ? "fill-warning text-warning"
                              : "text-muted-foreground"
                          )}
                        />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell
                    className="align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-0.5">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Métricas"
                        title="Atualizar métricas"
                        onClick={() => setMetricsTarget(post)}
                      >
                        <Gauge className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Análise"
                        title="Análise"
                        onClick={() => setAnalysisTarget(post)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Excluir post"
                        title="Excluir"
                        onClick={() => setDeleteTarget(post)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PostMetricsDrawer
        post={metricsTarget}
        open={metricsTarget !== null}
        onOpenChange={(open) => {
          if (!open) setMetricsTarget(null);
        }}
      />
      <PostAnalysisDrawer
        post={analysisTarget}
        open={analysisTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAnalysisTarget(null);
        }}
      />
      <PostDetailsModal
        post={detailsTarget}
        open={detailsTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null);
        }}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `O post "${deleteTarget.code}" será removido. Esta ação não pode ser desfeita.`
                : "Confirme a exclusão."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleteBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBusy ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
