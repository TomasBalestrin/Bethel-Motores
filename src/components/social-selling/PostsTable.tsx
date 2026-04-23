"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ExternalLink, FileText, Gauge, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { useDebounce } from "@/hooks/useDebounce";
import { PostMetricsDrawer } from "./PostMetricsDrawer";
import { PostAnalysisDrawer } from "./PostAnalysisDrawer";
import { PostDetailsModal } from "./PostDetailsModal";

type Filter = "all" | "fit" | "test" | "inactive";

interface PostsTableProps {
  posts: ProfilePost[];
}

export function PostsTable({ posts }: PostsTableProps) {
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
      if (filter === "inactive" && post.is_active) return false;
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
            <SelectItem value="inactive">Desativados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Impressões</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead>Em teste</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Fit</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
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
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{post.code}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateBR(post.created_at)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {post.link ? (
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCompactNumber(post.latest_metrics?.impressions ?? 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(post.latest_metrics?.spend ?? 0)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={Boolean(post.is_test)}
                      onCheckedChange={(checked) =>
                        patch(post, { is_test: checked })
                      }
                      aria-label="Em teste"
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={Boolean(post.is_active)}
                      onCheckedChange={(checked) =>
                        patch(post, { is_active: checked })
                      }
                      aria-label="Ativo"
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={post.is_fit ? "Remover fit" : "Marcar fit"}
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
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMetricsTarget(post)}
                      >
                        <Gauge className="mr-1 h-3.5 w-3.5" />
                        Métricas
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAnalysisTarget(post)}
                      >
                        <FileText className="mr-1 h-3.5 w-3.5" />
                        Análise
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Excluir post"
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
