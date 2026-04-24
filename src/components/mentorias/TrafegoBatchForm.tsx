"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
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

interface TrafegoBatchFormProps {
  mentoriaId: string;
}

const PLATFORM_OPTIONS: { value: TrafegoPlatform; label: string }[] = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "outro", label: "Outro" },
];

interface Row {
  id: string;
  date: string;
  value: string;
  platform: TrafegoPlatform;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function newRow(date?: string, platform?: TrafegoPlatform): Row {
  return {
    id: crypto.randomUUID(),
    date: date ?? todayISO(),
    value: "",
    platform: platform ?? "meta_ads",
  };
}

export function TrafegoBatchForm({ mentoriaId }: TrafegoBatchFormProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [submitting, setSubmitting] = useState(false);

  function addRow() {
    const last = rows[rows.length - 1];
    setRows([...rows, newRow(last?.date, last?.platform)]);
  }

  function removeRow(id: string) {
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((r) => r.id !== id)
    );
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const entries: { value: number; platform: TrafegoPlatform; captured_at: string }[] = [];
    for (const row of rows) {
      const numeric = Number(row.value.replace(",", "."));
      if (!Number.isFinite(numeric) || numeric <= 0) {
        toast.error("Valor inválido", {
          description: `Linha com data ${row.date} tem valor vazio ou zero`,
        });
        return;
      }
      if (!row.date) {
        toast.error("Data inválida");
        return;
      }
      entries.push({
        value: numeric,
        platform: row.platform,
        captured_at: row.date,
      });
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/mentorias/${mentoriaId}/trafego/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao registrar"
        );
      }
      const json = await response.json();
      const inserted = json?.data?.inserted ?? entries.length;
      toast.success(
        inserted === 1
          ? "1 lançamento registrado"
          : `${inserted} lançamentos registrados`
      );
      setRows([newRow()]);
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <div className="hidden grid-cols-[160px_160px_180px_40px] gap-2 text-[11px] font-medium uppercase text-muted-foreground sm:grid">
          <Label>Data</Label>
          <Label>Valor (R$)</Label>
          <Label>Plataforma</Label>
          <span />
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[160px_160px_180px_40px]"
          >
            <Input
              type="date"
              value={row.date}
              onChange={(e) => updateRow(row.id, { date: e.target.value })}
              className="h-9"
            />
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={row.value}
              onChange={(e) => updateRow(row.id, { value: e.target.value })}
              className="h-9"
              required
            />
            <Select
              value={row.platform}
              onValueChange={(v) =>
                updateRow(row.id, { platform: v as TrafegoPlatform })
              }
            >
              <SelectTrigger className="h-9">
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
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Remover linha"
              onClick={() => removeRow(row.id)}
              disabled={rows.length === 1}
              className="text-destructive hover:text-destructive disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={submitting}
        >
          <Plus className="mr-1 h-4 w-4" />
          Adicionar linha
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            `Salvar ${rows.length} lançamento${rows.length === 1 ? "" : "s"}`
          )}
        </Button>
      </div>
    </form>
  );
}
