"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  meetingCreateSchema,
  type MeetingCreateInput,
} from "@/lib/validators/post";
import type { MeetingType } from "@/types/post";

interface MeetingCreateModalProps {
  postId: string;
  meetingType: MeetingType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function MeetingCreateModal({
  postId,
  meetingType,
  open,
  onOpenChange,
  onCreated,
}: MeetingCreateModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<MeetingCreateInput>({
    resolver: zodResolver(meetingCreateSchema) as Resolver<MeetingCreateInput>,
    defaultValues: {
      meeting_type: meetingType,
      meeting_date: todayISO(),
      pause_post: false,
      metrics: {
        investment: 0,
        followers_gained: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reach: 0,
        impressions: 0,
        clicks: 0,
      },
    },
  });

  async function onSubmit(input: MeetingCreateInput) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${postId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, meeting_type: meetingType }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao registrar reunião"
        );
      }
      toast.success("Reunião registrada");
      form.reset();
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível registrar", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  const label = meetingType === "terca" ? "terça" : "sexta";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova reunião de {label}</DialogTitle>
          <DialogDescription>
            Informe as métricas atualizadas do post nesta reunião.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="meeting-date">Data da reunião</Label>
            <Input
              id="meeting-date"
              type="date"
              {...form.register("meeting_date")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="m-impressions">Impressões</Label>
              <Input
                id="m-impressions"
                type="number"
                min={0}
                {...form.register("metrics.impressions", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-reach">Alcance</Label>
              <Input
                id="m-reach"
                type="number"
                min={0}
                {...form.register("metrics.reach", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-likes">Curtidas</Label>
              <Input
                id="m-likes"
                type="number"
                min={0}
                {...form.register("metrics.likes", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-comments">Comentários</Label>
              <Input
                id="m-comments"
                type="number"
                min={0}
                {...form.register("metrics.comments", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-shares">Compartilhamentos</Label>
              <Input
                id="m-shares"
                type="number"
                min={0}
                {...form.register("metrics.shares", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-saves">Salvamentos</Label>
              <Input
                id="m-saves"
                type="number"
                min={0}
                {...form.register("metrics.saves", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-clicks">Cliques</Label>
              <Input
                id="m-clicks"
                type="number"
                min={0}
                {...form.register("metrics.clicks", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-followers">Seguidores ganhos</Label>
              <Input
                id="m-followers"
                type="number"
                min={0}
                {...form.register("metrics.followers_gained", { valueAsNumber: true })}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="m-investment">Gasto (R$)</Label>
              <Input
                id="m-investment"
                type="number"
                min={0}
                step="0.01"
                {...form.register("metrics.investment", { valueAsNumber: true })}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <input
              type="checkbox"
              {...form.register("pause_post")}
              className="h-4 w-4 accent-primary"
            />
            Pausar post após esta reunião
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar reunião"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
