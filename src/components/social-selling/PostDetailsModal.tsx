"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
} from "@/lib/utils/format";
import type { MeetingType, PostMeeting } from "@/types/post";
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

  if (!post) return null;

  const isActive = activeOverride ?? Boolean(post.is_active);
  const tercaMeetings = meetings.filter((m) => m.meeting_type === "terca");
  const sextaMeetings = meetings.filter((m) => m.meeting_type === "sexta");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono">{post.code}</span>
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
              Gerencie as reuniões e decisões sobre este post.
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

          <div className="grid gap-4 md:grid-cols-2">
            <MeetingSection
              title="Reuniões de terça"
              meetings={tercaMeetings}
              loading={loading}
              onCreate={() => setCreateTarget("terca")}
              onEdit={setEditTarget}
              onDelete={handleDeleteMeeting}
            />
            <MeetingSection
              title="Reuniões de sexta"
              meetings={sextaMeetings}
              loading={loading}
              onCreate={() => setCreateTarget("sexta")}
              onEdit={setEditTarget}
              onDelete={handleDeleteMeeting}
            />
          </div>
        </DialogContent>
      </Dialog>

      {createTarget ? (
        <MeetingCreateModal
          postId={post.id}
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

function MeetingSection({
  title,
  meetings,
  loading,
  onCreate,
  onEdit,
  onDelete,
}: {
  title: string;
  meetings: PostMeeting[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (meeting: PostMeeting) => void;
  onDelete: (id: string) => void;
}) {
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
        <p className="py-4 text-center text-xs text-muted-foreground">
          Nenhuma reunião registrada.
        </p>
      ) : (
        <ul className="space-y-1">
          {meetings.map((meeting) => (
            <li
              key={meeting.id}
              className="flex items-center justify-between gap-1 rounded-md bg-muted/30 px-2 py-1.5 text-xs"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">
                  {formatDateBR(meeting.meeting_date)}
                </span>
                {meeting.metrics ? (
                  <span className="text-[10px] text-muted-foreground">
                    {formatCompactNumber(meeting.metrics.impressions)} impressões
                    · {formatCurrency(meeting.metrics.spend)}
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
                  onClick={() => onEdit(meeting)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Excluir reunião"
                  onClick={() => onDelete(meeting.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
