"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CreativeFormat,
  MentoriaCreative,
} from "@/services/creatives.service";

interface CreativeFormModalProps {
  mentoriaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  creative?: MentoriaCreative | null;
}

interface FormState {
  code: string;
  format: CreativeFormat;
  headline: string;
  link: string;
  leads: string;
  qualified_leads: string;
  impressions: string;
  reach: string;
  clicks: string;
  hook_rate_3s: string;
  hold_50: string;
  hold_75: string;
  duration_seconds: string;
  notes: string;
}

function blankForm(): FormState {
  return {
    code: "",
    format: "video",
    headline: "",
    link: "",
    leads: "",
    qualified_leads: "",
    impressions: "",
    reach: "",
    clicks: "",
    hook_rate_3s: "",
    hold_50: "",
    hold_75: "",
    duration_seconds: "",
    notes: "",
  };
}

function formFromCreative(c: MentoriaCreative): FormState {
  const pct = (v: number | null): string =>
    v !== null ? (v * 100).toFixed(2).replace(".", ",") : "";
  const num = (v: number | null | undefined): string =>
    v !== null && v !== undefined ? String(v) : "";
  return {
    code: c.code,
    format: c.format,
    headline: c.headline ?? "",
    link: c.link ?? "",
    leads: num(c.leads),
    qualified_leads: num(c.qualified_leads),
    impressions: num(c.impressions),
    reach: num(c.reach),
    clicks: num(c.clicks),
    hook_rate_3s: pct(c.hook_rate_3s),
    hold_50: pct(c.hold_50),
    hold_75: pct(c.hold_75),
    duration_seconds: num(c.duration_seconds),
    notes: c.notes ?? "",
  };
}

function parseInt0(raw: string): number {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function parsePercent(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  // Usuário digita "42,62" = 42.62% = 0.4262 armazenado
  return Math.min(1, n / 100);
}

function parseNullInt(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function CreativeFormModal({
  mentoriaId,
  open,
  onOpenChange,
  mode,
  creative = null,
}: CreativeFormModalProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(blankForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(mode === "edit" && creative ? formFromCreative(creative) : blankForm());
    }
  }, [open, mode, creative]);

  const derived = useMemo(() => {
    const impressions = parseInt0(form.impressions);
    const clicks = parseInt0(form.clicks);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
    return { ctr };
  }, [form.impressions, form.clicks]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.code.trim()) {
      toast.error("Informe o código");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        code: form.code.trim(),
        format: form.format,
        headline: form.headline.trim() || null,
        link: form.link.trim() || null,
        leads: parseInt0(form.leads),
        qualified_leads: parseInt0(form.qualified_leads),
        impressions: parseInt0(form.impressions),
        reach: parseInt0(form.reach),
        clicks: parseInt0(form.clicks),
        hook_rate_3s: form.format === "video" ? parsePercent(form.hook_rate_3s) : null,
        hold_50: form.format === "video" ? parsePercent(form.hold_50) : null,
        hold_75: form.format === "video" ? parsePercent(form.hold_75) : null,
        duration_seconds:
          form.format === "video" ? parseNullInt(form.duration_seconds) : null,
        notes: form.notes.trim() || null,
      };
      const url =
        mode === "edit" && creative
          ? `/api/creatives/${creative.id}`
          : `/api/mentorias/${mentoriaId}/creatives`;
      const method = mode === "edit" ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao salvar"
        );
      }
      toast.success(mode === "edit" ? "Criativo atualizado" : "Criativo criado");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar criativo" : "Novo criativo"}
          </DialogTitle>
          <DialogDescription>
            Registre código, tipo e métricas de performance. Investido é
            calculado automaticamente dos lançamentos vinculados.
          </DialogDescription>
        </DialogHeader>

        <form
          id="creative-form"
          onSubmit={handleSubmit}
          className="max-h-[65vh] space-y-4 overflow-y-auto pr-1"
        >
          {/* Identificação */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Identificação
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="creative-code">Código</Label>
                <Input
                  id="creative-code"
                  placeholder="V1, V2, E1..."
                  value={form.code}
                  onChange={(e) => update("code", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="creative-format">Tipo</Label>
                <Select
                  value={form.format}
                  onValueChange={(v) => update("format", v as CreativeFormat)}
                >
                  <SelectTrigger id="creative-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="static">Estático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="creative-headline">Headline</Label>
              <Input
                id="creative-headline"
                placeholder="Gancho principal do criativo"
                value={form.headline}
                onChange={(e) => update("headline", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="creative-link">Link de preview</Label>
              <Input
                id="creative-link"
                type="url"
                placeholder="https://..."
                value={form.link}
                onChange={(e) => update("link", e.target.value)}
              />
            </div>
          </section>

          {/* Performance geral */}
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Performance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="c-leads">Leads</Label>
                <Input
                  id="c-leads"
                  type="number"
                  min={0}
                  value={form.leads}
                  onChange={(e) => update("leads", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-qualified">Qualificados</Label>
                <Input
                  id="c-qualified"
                  type="number"
                  min={0}
                  value={form.qualified_leads}
                  onChange={(e) => update("qualified_leads", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-impressions">Impressões</Label>
                <Input
                  id="c-impressions"
                  type="number"
                  min={0}
                  value={form.impressions}
                  onChange={(e) => update("impressions", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-reach">Alcance</Label>
                <Input
                  id="c-reach"
                  type="number"
                  min={0}
                  value={form.reach}
                  onChange={(e) => update("reach", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-clicks">Cliques</Label>
                <Input
                  id="c-clicks"
                  type="number"
                  min={0}
                  value={form.clicks}
                  onChange={(e) => update("clicks", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>CTR (calculado)</Label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm tabular-nums text-muted-foreground">
                  {derived.ctr !== null ? `${derived.ctr.toFixed(2)}%` : "—"}
                </div>
              </div>
            </div>
          </section>

          {/* Performance de vídeo — só aparece quando format=video */}
          {form.format === "video" ? (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Performance de vídeo
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="c-hook">Hook Rate 3s (%)</Label>
                  <Input
                    id="c-hook"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    placeholder="Ex: 42,62"
                    value={form.hook_rate_3s}
                    onChange={(e) => update("hook_rate_3s", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-duration">Duração (segundos)</Label>
                  <Input
                    id="c-duration"
                    type="number"
                    min={0}
                    placeholder="Ex: 60"
                    value={form.duration_seconds}
                    onChange={(e) => update("duration_seconds", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-hold50">Hold 50% (%)</Label>
                  <Input
                    id="c-hold50"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    placeholder="Ex: 8,5"
                    value={form.hold_50}
                    onChange={(e) => update("hold_50", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-hold75">Hold 75% (%)</Label>
                  <Input
                    id="c-hold75"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    placeholder="Ex: 5,0"
                    value={form.hold_75}
                    onChange={(e) => update("hold_75", e.target.value)}
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* Anotações */}
          <section className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="c-notes">Anotações</Label>
            <textarea
              id="c-notes"
              rows={3}
              placeholder="Observações da equipe, decisões sobre o criativo, etc."
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </section>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="submit" form="creative-form" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : mode === "edit" ? (
              "Salvar alterações"
            ) : (
              "Criar criativo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
