"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PlatformBreakdown,
  TrafegoPlatform,
} from "@/services/mentorias.service";

interface TrafegoBudgetEditorProps {
  mentoriaId: string;
  current: PlatformBreakdown[];
}

const PLATFORM_LABELS: Record<TrafegoPlatform, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok: "TikTok",
  youtube: "YouTube",
  outro: "Outro",
};

export function TrafegoBudgetEditor({
  mentoriaId,
  current,
}: TrafegoBudgetEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<TrafegoPlatform, string>>({
    meta_ads: "",
    google_ads: "",
    tiktok: "",
    youtube: "",
    outro: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const next: Record<TrafegoPlatform, string> = {
        meta_ads: "",
        google_ads: "",
        tiktok: "",
        youtube: "",
        outro: "",
      };
      for (const item of current) {
        next[item.platform] = item.budget > 0 ? String(item.budget) : "";
      }
      setValues(next);
    }
  }, [open, current]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const budgets: { platform: TrafegoPlatform; amount: number }[] = [];
    for (const platform of Object.keys(values) as TrafegoPlatform[]) {
      const raw = values[platform].replace(",", ".").trim();
      const amount = raw === "" ? 0 : Number(raw);
      if (!Number.isFinite(amount) || amount < 0) {
        toast.error(`Valor inválido para ${PLATFORM_LABELS[platform]}`);
        return;
      }
      budgets.push({ platform, amount });
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/mentorias/${mentoriaId}/trafego/budgets`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budgets }),
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao salvar"
        );
      }
      toast.success("Orçamentos atualizados");
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  const total = Object.values(values).reduce((sum, raw) => {
    const n = Number(raw.replace(",", "."));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Editar orçamentos">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Orçamento por plataforma</DialogTitle>
          <DialogDescription>
            Defina o orçamento de cada plataforma. O total é calculado
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          {(Object.keys(PLATFORM_LABELS) as TrafegoPlatform[]).map(
            (platform) => (
              <div key={platform} className="space-y-1">
                <Label htmlFor={`budget-${platform}`}>
                  {PLATFORM_LABELS[platform]}
                </Label>
                <Input
                  id={`budget-${platform}`}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={values[platform]}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [platform]: e.target.value,
                    }))
                  }
                />
              </div>
            )
          )}

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-heading font-semibold tabular-nums">
              {total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 0,
              })}
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
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
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
