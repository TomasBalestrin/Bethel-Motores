"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  formatCompactNumber,
  formatCurrency,
  formatDateBR,
  formatInteger,
  formatPercent,
} from "@/lib/utils/format";
import type {
  MeetingType,
  PostMeeting,
  PostMeetingMetrics,
} from "@/types/post";
import type { ProfilePost } from "@/services/social-profiles.service";
import { MeetingCreateModal } from "./MeetingCreateModal";

interface PostDetailsModalProps {
  post: ProfilePost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostDetailsModal({
  post,
  open,
  onOpenChange,
}: PostDetailsModalProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<PostMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [createTarget, setCreateTarget] = useState<MeetingType | null>(null);
  const [editTarget, setEditTarget] = useState<PostMeeting | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const [activeOverride, setActiveOverride] = useState<boolean | null>(null);

  const fetchMeetings = useCallback(async () => {
    if (!post) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/meetings`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao carregar reuniões"
        );
      }
      const json = await response.json();
      setMeetings((json.data ?? []) as PostMeeting[]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Falha ao carregar reuniões", { description: message });
    } finally {
      setLoading(false);
    }
  }, [post]);

  useEffect(() => {
    if (open && post) {
      setActiveOverride(null);
      void fetchMeetings();
    }
  }, [open, post, fetchMeetings]);

  async function handleDeleteMeeting(id: string) {
    if (!confirm("Excluir esta reunião e seu snapshot de métricas?")) return;
    try {
      const response = await fetch(`/api/meetings/${id}`, {
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
      toast.success("Reunião excluída");
      await fetchMeetings();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível excluir", { description: message });
    }
  }

  async function toggleActive(checked: boolean) {
    if (!post) return;
    setTogglingActive(true);
    setActiveOverride(checked);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: checked }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao atualizar"
        );
      }
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível alterar", { description: message });
      setActiveOverride(!checked);
    } finally {
      setTogglingActive(false);
    }
  }

  const sortByDateDesc = (a: PostMeeting, b: PostMeeting) =>
    b.meeting_date.localeCompare(a.meeting_date);
  const tercaMeetings = useMemo(
    () => meetings.filter((m) => m.meeting_type === "terca").sort(sortByDateDesc),
    [meetings]
  );
  const sextaMeetings = useMemo(
    () => meetings.filter((m) => m.meeting_type === "sexta").sort(sortByDateDesc),
    [meetings]
  );

  const [tercaSelectedId, setTercaSelectedId] = useState<string | null>(null);
  const [sextaSelectedId, setSextaSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const first = tercaMeetings[0];
    if (!first) {
      setTercaSelectedId(null);
    } else if (!tercaMeetings.some((m) => m.id === tercaSelectedId)) {
      setTercaSelectedId(first.id);
    }
  }, [tercaMeetings, tercaSelectedId]);

  useEffect(() => {
    const first = sextaMeetings[0];
    if (!first) {
      setSextaSelectedId(null);
    } else if (!sextaMeetings.some((m) => m.id === sextaSelectedId)) {
      setSextaSelectedId(first.id);
    }
  }, [sextaMeetings, sextaSelectedId]);

  if (!post) return null;

  const isActive = activeOverride ?? Boolean(post.is_active);
  const tercaSelected =
    tercaMeetings.find((m) => m.id === tercaSelectedId) ?? null;
  const sextaSelected =
    sextaMeetings.find((m) => m.id === sextaSelectedId) ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono">{post.code}</span>
              <span
                className={
                  post.post_type === "impulsionar"
                    ? "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary"
                    : "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600"
                }
              >
                {post.post_type === "impulsionar" ? "Impulsionar" : "Orgânico"}
              </span>
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
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {post.headline ? (
                <span className="text-foreground">{post.headline}</span>
              ) : (
                "Gerencie as reuniões e decisões sobre este post."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <Switch
              checked={isActive}
              onCheckedChange={toggleActive}
              disabled={togglingActive}
              aria-label="Ativo"
            />
            <span className="font-medium">
              {isActive ? "Post ativo" : "Post pausado"}
            </span>
            {post.latest_metrics ? (
              <span className="ml-auto text-xs text-muted-foreground">
                Última atualização: {" "}
                {formatCompactNumber(post.latest_metrics.impressions ?? 0)}{" "}
                impressões · {formatCurrency(post.latest_metrics.spend ?? 0)} gasto
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <MeetingPicker
              title="Reunião de terça"
              meetings={tercaMeetings}
              selectedId={tercaSelectedId}
              onSelect={setTercaSelectedId}
              loading={loading}
              onCreate={() => setCreateTarget("terca")}
              onEdit={setEditTarget}
              onDelete={handleDeleteMeeting}
            />
            <MeetingPicker
              title="Reunião de sexta"
              meetings={sextaMeetings}
              selectedId={sextaSelectedId}
              onSelect={setSextaSelectedId}
              loading={loading}
              onCreate={() => setCreateTarget("sexta")}
              onEdit={setEditTarget}
              onDelete={handleDeleteMeeting}
            />
          </div>

          <ComparisonTable
            terca={tercaSelected}
            sexta={sextaSelected}
          />
        </DialogContent>
      </Dialog>

      {createTarget ? (
        <MeetingCreateModal
          postId={post.id}
          postType={post.post_type}
          meetingType={createTarget}
          open={createTarget !== null}
          onOpenChange={(next) => {
            if (!next) setCreateTarget(null);
          }}
          onCreated={async () => {
            setCreateTarget(null);
            await fetchMeetings();
            router.refresh();
          }}
        />
      ) : null}

      {editTarget ? (
        <MeetingCreateModal
          postId={post.id}
          postType={post.post_type}
          meetingType={editTarget.meeting_type}
          mode="edit"
          editing={editTarget}
          open={editTarget !== null}
          onOpenChange={(next) => {
            if (!next) setEditTarget(null);
          }}
          onCreated={async () => {
            setEditTarget(null);
            await fetchMeetings();
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function MeetingPicker({
  title,
  meetings,
  selectedId,
  onSelect,
  loading,
  onCreate,
  onEdit,
  onDelete,
}: {
  title: string;
  meetings: PostMeeting[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  onCreate: () => void;
  onEdit: (meeting: PostMeeting) => void;
  onDelete: (id: string) => void;
}) {
  const selected = meetings.find((m) => m.id === selectedId) ?? null;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button size="sm" variant="outline" onClick={onCreate}>
          <Plus className="mr-1 h-3 w-3" />
          Nova
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Carregando...
        </div>
      ) : meetings.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          Nenhuma reunião registrada.
        </p>
      ) : (
        <>
          {meetings.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {meetings.map((meeting) => (
                <button
                  key={meeting.id}
                  type="button"
                  onClick={() => onSelect(meeting.id)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] tabular-nums transition-colors",
                    meeting.id === selectedId
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {formatDateBR(meeting.meeting_date)}
                </button>
              ))}
            </div>
          ) : null}

          {selected ? (
            <div className="flex items-center justify-between gap-1 rounded-md bg-muted/40 px-2 py-1.5 text-xs">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">
                  {formatDateBR(selected.meeting_date)}
                </span>
                {selected.metrics ? (
                  <span className="text-[10px] text-muted-foreground">
                    {formatCompactNumber(selected.metrics.impressions)} impressões
                    · {formatCurrency(selected.metrics.spend)}
                  </span>
                ) : (
                  <span className="text-[10px] italic text-muted-foreground">
                    Sem métricas — clique em editar para preencher
                  </span>
                )}
              </div>
              <div className="flex gap-0.5">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Editar reunião"
                  onClick={() => onEdit(selected)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Excluir reunião"
                  onClick={() => onDelete(selected.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

type MetricKind = "int" | "currency" | "percent";
type DeltaBias = "higher_better" | "lower_better" | "neutral";

interface ComparisonRow {
  label: string;
  terca: number | null;
  sexta: number | null;
  kind: MetricKind;
  bias: DeltaBias;
}

function cpm(metrics: PostMeetingMetrics | null): number | null {
  if (!metrics || !metrics.impressions) return null;
  return (metrics.spend / metrics.impressions) * 1000;
}

function cpc(metrics: PostMeetingMetrics | null): number | null {
  if (!metrics || !metrics.clicks) return null;
  return metrics.spend / metrics.clicks;
}

function ctr(metrics: PostMeetingMetrics | null): number | null {
  if (!metrics || !metrics.impressions) return null;
  return (metrics.clicks / metrics.impressions) * 100;
}

function engajamento(metrics: PostMeetingMetrics | null): number | null {
  if (!metrics || !metrics.impressions) return null;
  const total =
    metrics.likes + metrics.comments + metrics.shares + metrics.saves;
  return (total / metrics.impressions) * 100;
}

function buildRows(
  terca: PostMeetingMetrics | null,
  sexta: PostMeetingMetrics | null
): ComparisonRow[] {
  const hasVideo =
    (terca?.duration_seconds ?? null) !== null ||
    (sexta?.duration_seconds ?? null) !== null ||
    terca?.hook_rate_3s != null ||
    sexta?.hook_rate_3s != null;

  const rows: ComparisonRow[] = [
    {
      label: "Impressões",
      terca: terca?.impressions ?? null,
      sexta: sexta?.impressions ?? null,
      kind: "int",
      bias: "higher_better",
    },
    {
      label: "Alcance",
      terca: terca?.reach ?? null,
      sexta: sexta?.reach ?? null,
      kind: "int",
      bias: "higher_better",
    },
    {
      label: "Cliques",
      terca: terca?.clicks ?? null,
      sexta: sexta?.clicks ?? null,
      kind: "int",
      bias: "higher_better",
    },
    {
      label: "CTR",
      terca: ctr(terca),
      sexta: ctr(sexta),
      kind: "percent",
      bias: "higher_better",
    },
    {
      label: "Engajamento",
      terca: engajamento(terca),
      sexta: engajamento(sexta),
      kind: "percent",
      bias: "higher_better",
    },
    {
      label: "Curtidas",
      terca: terca?.likes ?? null,
      sexta: sexta?.likes ?? null,
      kind: "int",
      bias: "higher_better",
    },
    {
      label: "Comentários",
      terca: terca?.comments ?? null,
      sexta: sexta?.comments ?? null,
      kind: "int",
      bias: "higher_better",
    },
    {
      label: "Compartilhamentos",
      terca: terca?.shares ?? null,
      sexta: sexta?.shares ?? null,
      kind: "int",
      bias: "higher_better",
    },
    {
      label: "Salvamentos",
      terca: terca?.saves ?? null,
      sexta: sexta?.saves ?? null,
      kind: "int",
      bias: "higher_better",
    },
    {
      label: "Seguidores ganhos",
      terca: terca?.followers_gained ?? null,
      sexta: sexta?.followers_gained ?? null,
      kind: "int",
      bias: "higher_better",
    },
    {
      label: "Gasto",
      terca: terca?.spend ?? null,
      sexta: sexta?.spend ?? null,
      kind: "currency",
      bias: "neutral",
    },
    {
      label: "Investimento",
      terca: terca?.investment ?? null,
      sexta: sexta?.investment ?? null,
      kind: "currency",
      bias: "neutral",
    },
    {
      label: "CPM",
      terca: cpm(terca),
      sexta: cpm(sexta),
      kind: "currency",
      bias: "lower_better",
    },
    {
      label: "CPC",
      terca: cpc(terca),
      sexta: cpc(sexta),
      kind: "currency",
      bias: "lower_better",
    },
  ];

  if (hasVideo) {
    rows.push(
      {
        label: "Hook rate 3s",
        terca: terca?.hook_rate_3s ?? null,
        sexta: sexta?.hook_rate_3s ?? null,
        kind: "percent",
        bias: "higher_better",
      },
      {
        label: "Hold 50%",
        terca: terca?.hold_50 ?? null,
        sexta: sexta?.hold_50 ?? null,
        kind: "percent",
        bias: "higher_better",
      },
      {
        label: "Hold 75%",
        terca: terca?.hold_75 ?? null,
        sexta: sexta?.hold_75 ?? null,
        kind: "percent",
        bias: "higher_better",
      }
    );
  }

  return rows;
}

function formatValue(value: number | null, kind: MetricKind): string {
  if (value == null) return "—";
  if (kind === "currency") return formatCurrency(value);
  if (kind === "percent") return formatPercent(value, 1);
  return formatInteger(value);
}

function DeltaCell({
  row,
}: {
  row: ComparisonRow;
}) {
  if (row.terca == null || row.sexta == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const diff = row.sexta - row.terca;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        0
      </span>
    );
  }
  const isPositive = diff > 0;
  const goodDirection =
    row.bias === "higher_better"
      ? isPositive
      : row.bias === "lower_better"
        ? !isPositive
        : null;
  const colorClass =
    goodDirection == null
      ? "text-muted-foreground"
      : goodDirection
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-destructive";
  const absDiff = Math.abs(diff);
  const pct =
    row.terca !== 0 ? ((diff / Math.abs(row.terca)) * 100).toFixed(0) : null;
  return (
    <span
      className={cn("inline-flex items-center gap-1 tabular-nums", colorClass)}
    >
      {isPositive ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      <span>{formatValue(absDiff, row.kind)}</span>
      {pct ? (
        <span className="text-[10px] opacity-70">
          ({isPositive ? "+" : "−"}
          {pct.replace("-", "")}%)
        </span>
      ) : null}
    </span>
  );
}

function ComparisonTable({
  terca,
  sexta,
}: {
  terca: PostMeeting | null;
  sexta: PostMeeting | null;
}) {
  const tercaMetrics = terca?.metrics ?? null;
  const sextaMetrics = sexta?.metrics ?? null;
  const hasAny = tercaMetrics || sextaMetrics;

  if (!hasAny) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Cadastre métricas nas reuniões acima pra ver a comparação.
      </div>
    );
  }

  const rows = buildRows(tercaMetrics, sextaMetrics);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Métrica</span>
        <span className="text-right">
          Terça
          {terca ? (
            <span className="ml-1 block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/80">
              {formatDateBR(terca.meeting_date)}
            </span>
          ) : null}
        </span>
        <span className="text-right">
          Sexta
          {sexta ? (
            <span className="ml-1 block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/80">
              {formatDateBR(sexta.meeting_date)}
            </span>
          ) : null}
        </span>
        <span className="text-right">Δ</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-3 py-1.5 text-xs"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-right font-medium tabular-nums">
              {formatValue(row.terca, row.kind)}
            </span>
            <span className="text-right font-medium tabular-nums">
              {formatValue(row.sexta, row.kind)}
            </span>
            <span className="text-right">
              <DeltaCell row={row} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
