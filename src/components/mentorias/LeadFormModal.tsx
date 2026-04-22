"use client";

import { useEffect, useState } from "react";
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
import type { Lead } from "@/types/lead";

interface LeadFormModalProps {
  mode: "create" | "edit";
  funnelId: string;
  lead?: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormState {
  name: string;
  phone: string;
  instagram_handle: string;
  revenue: string;
  niche: string;
  joined_group: boolean;
  confirmed_presence: boolean;
  attended: boolean;
  scheduled: boolean;
  sold: boolean;
  sale_value: string;
  entry_value: string;
}

function parseMoney(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[R$\s ]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function moneyToString(value: number | null): string {
  if (value == null) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function initialStateFrom(lead?: Lead): FormState {
  return {
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    instagram_handle: lead?.instagram_handle ?? "",
    revenue: moneyToString(lead?.revenue ?? null),
    niche: lead?.niche ?? "",
    joined_group: lead?.joined_group ?? false,
    confirmed_presence: lead?.confirmed_presence ?? false,
    attended: lead?.attended ?? false,
    scheduled: lead?.scheduled ?? false,
    sold: lead?.sold ?? false,
    sale_value: moneyToString(lead?.sale_value ?? null),
    entry_value: moneyToString(lead?.entry_value ?? null),
  };
}

export function LeadFormModal({
  mode,
  funnelId,
  lead,
  open,
  onOpenChange,
  onSuccess,
}: LeadFormModalProps) {
  const [form, setForm] = useState<FormState>(() => initialStateFrom(lead));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(initialStateFrom(lead));
  }, [open, lead]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Nome é obrigatório");
      return;
    }

    const payload = {
      name,
      phone: form.phone.trim() || null,
      instagram_handle: form.instagram_handle.trim().replace(/^@/, "") || null,
      revenue: parseMoney(form.revenue),
      niche: form.niche.trim() || null,
      joined_group: form.joined_group,
      confirmed_presence: form.confirmed_presence,
      attended: form.attended,
      scheduled: form.scheduled,
      sold: form.sold,
      sale_value: form.sold ? parseMoney(form.sale_value) : null,
      entry_value: form.sold ? parseMoney(form.entry_value) : null,
    };

    setSubmitting(true);
    try {
      const url =
        mode === "edit" && lead
          ? `/api/leads/${lead.id}`
          : `/api/funnels/${funnelId}/leads`;
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

      toast.success(mode === "edit" ? "Lead atualizado" : "Lead criado");
      onOpenChange(false);
      onSuccess?.();
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar lead" : "Novo lead"}
          </DialogTitle>
          <DialogDescription>
            Informações pessoais, qualificação e estágios no funil.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Nome *</Label>
            <Input
              id="lead-name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Telefone</Label>
              <Input
                id="lead-phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-ig">@ Instagram</Label>
              <Input
                id="lead-ig"
                value={form.instagram_handle}
                onChange={(e) => update("instagram_handle", e.target.value)}
                placeholder="usuario"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-revenue">Faturamento (R$)</Label>
              <Input
                id="lead-revenue"
                value={form.revenue}
                onChange={(e) => update("revenue", e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-niche">Nicho</Label>
              <Input
                id="lead-niche"
                value={form.niche}
                onChange={(e) => update("niche", e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Estágios
            </Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 sm:grid-cols-5">
              {(
                [
                  { key: "joined_group", label: "Grupo" },
                  { key: "confirmed_presence", label: "Presença" },
                  { key: "attended", label: "Compareceu" },
                  { key: "scheduled", label: "Agendado" },
                  { key: "sold", label: "Venda" },
                ] as const
              ).map((entry) => (
                <label
                  key={entry.key}
                  className="flex cursor-pointer items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={form[entry.key]}
                    onChange={(event) => update(entry.key, event.target.checked)}
                    className="h-4 w-4"
                  />
                  {entry.label}
                </label>
              ))}
            </div>
          </div>

          {form.sold ? (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-sale">Valor de venda (R$)</Label>
                <Input
                  id="lead-sale"
                  value={form.sale_value}
                  onChange={(e) => update("sale_value", e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-entry">Valor de entrada (R$)</Label>
                <Input
                  id="lead-entry"
                  value={form.entry_value}
                  onChange={(e) => update("entry_value", e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
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
              ) : mode === "edit" ? (
                "Salvar"
              ) : (
                "Criar lead"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
