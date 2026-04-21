"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
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
import type { DisparoEvent } from "@/services/mentorias.service";

interface DisparoFormModalProps {
  mode?: "create" | "edit";
  mentoriaId: string;
  disparo?: DisparoEvent;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface FormState {
  received_at: string;
  funnel_label: string;
  volume_sent: string;
  volume_delivered: string;
  cost: string;
}

function isoToDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nowDatetimeLocal(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function initialStateFrom(disparo?: DisparoEvent): FormState {
  if (disparo) {
    return {
      received_at: isoToDatetimeLocal(disparo.received_at),
      funnel_label: disparo.funnel_label ?? "",
      volume_sent: String(disparo.volume_sent ?? 0),
      volume_delivered: String(disparo.volume_delivered ?? 0),
      cost: String(disparo.cost ?? 0),
    };
  }
  return {
    received_at: nowDatetimeLocal(),
    funnel_label: "",
    volume_sent: "",
    volume_delivered: "",
    cost: "",
  };
}

export function DisparoFormModal({
  mode = "create",
  mentoriaId,
  disparo,
  trigger,
  open: openProp,
  onOpenChange,
}: DisparoFormModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => initialStateFrom(disparo));
  const [submitting, setSubmitting] = useState(false);

  const isControlled = typeof openProp === "boolean";
  const open = isControlled ? openProp : internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
    if (next) {
      setForm(initialStateFrom(disparo));
    }
  };

  useEffect(() => {
    if (open) setForm(initialStateFrom(disparo));
  }, [open, disparo]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.received_at) {
      toast.error("Informe data e horário");
      return;
    }

    const payload = {
      received_at: new Date(form.received_at).toISOString(),
      funnel_label: form.funnel_label.trim() || null,
      volume_sent: Number(form.volume_sent || 0),
      volume_delivered: Number(form.volume_delivered || 0),
      cost: Number(form.cost || 0),
    };

    setSubmitting(true);
    try {
      const url =
        mode === "edit" && disparo
          ? `/api/disparos/${disparo.id}`
          : `/api/mentorias/${mentoriaId}/disparos`;
      const method = mode === "edit" ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string" ? data.error : "Erro ao salvar"
        );
      }

      toast.success(
        mode === "edit" ? "Disparo atualizado" : "Disparo registrado"
      );
      handleOpenChange(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm">
        <Plus className="mr-1 h-4 w-4" />
        Novo disparo
      </Button>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled ? (
        <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      ) : null}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar disparo" : "Novo disparo"}
          </DialogTitle>
          <DialogDescription>
            Registre manualmente o volume e custo de um disparo desta mentoria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="disparo-date">Data e horário</Label>
            <Input
              id="disparo-date"
              type="datetime-local"
              value={form.received_at}
              onChange={(event) => update("received_at", event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="disparo-funnel">Funil (opcional)</Label>
            <Input
              id="disparo-funnel"
              type="text"
              value={form.funnel_label}
              onChange={(event) => update("funnel_label", event.target.value)}
              placeholder="Ex: Boas-vindas, Lembrete call"
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="disparo-sent">Enviado</Label>
              <Input
                id="disparo-sent"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.volume_sent}
                onChange={(event) => update("volume_sent", event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disparo-delivered">Entregue</Label>
              <Input
                id="disparo-delivered"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.volume_delivered}
                onChange={(event) =>
                  update("volume_delivered", event.target.value)
                }
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="disparo-cost">Custo (R$)</Label>
            <Input
              id="disparo-cost"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.cost}
              onChange={(event) => update("cost", event.target.value)}
              placeholder="0,00"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
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
              ) : mode === "edit" ? (
                "Salvar alterações"
              ) : (
                "Registrar disparo"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
