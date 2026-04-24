"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TrafegoPlatform } from "@/services/mentorias.service";

interface FunnelOption {
  id: string;
  name: string;
}

interface TrafegoInlineFormProps {
  mentoriaId: string;
  funnels: FunnelOption[];
}

const PLATFORM_OPTIONS: { value: TrafegoPlatform; label: string }[] = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "outro", label: "Outro" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TrafegoInlineForm({ mentoriaId, funnels }: TrafegoInlineFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [value, setValue] = useState("");
  const [platform, setPlatform] = useState<TrafegoPlatform>("meta_ads");
  const [funnelId, setFunnelId] = useState<string>(funnels[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numeric = Number(value.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error("Valor inválido", { description: "Informe um valor positivo" });
      return;
    }

    setSubmitting(true);
    try {
      const capturedAt = new Date(`${date}T12:00:00.000Z`).toISOString();
      const response = await fetch(
        `/api/mentorias/${mentoriaId}/trafego`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value: numeric,
            platform,
            captured_at: capturedAt,
            funnel_id: funnelId || null,
          }),
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Erro ao registrar");
      }
      toast.success("Investimento registrado");
      setValue("");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível registrar", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3"
    >
      <div className="space-y-1">
        <Label htmlFor="trafego-date" className="text-xs">
          Data
        </Label>
        <Input
          id="trafego-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="h-9 w-[150px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="trafego-value" className="text-xs">
          Valor (R$)
        </Label>
        <Input
          id="trafego-value"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-9 w-[140px]"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="trafego-platform" className="text-xs">
          Plataforma
        </Label>
        <Select
          value={platform}
          onValueChange={(next) => setPlatform(next as TrafegoPlatform)}
        >
          <SelectTrigger id="trafego-platform" className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="trafego-funnel" className="text-xs">
          Funil destino
        </Label>
        <Select
          value={funnelId}
          onValueChange={(next) => setFunnelId(next)}
          disabled={funnels.length === 0}
        >
          <SelectTrigger id="trafego-funnel" className="h-9 w-[180px]">
            <SelectValue
              placeholder={
                funnels.length === 0 ? "Sem funis" : "Selecione um funil"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {funnels.map((funnel) => (
              <SelectItem key={funnel.id} value={funnel.id}>
                {funnel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            Registrando...
          </>
        ) : (
          <>
            <Plus className="mr-1 h-4 w-4" />
            Registrar
          </>
        )}
      </Button>
    </form>
  );
}
