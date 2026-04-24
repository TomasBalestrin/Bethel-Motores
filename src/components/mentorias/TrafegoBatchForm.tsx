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

interface CreativeOption {
  id: string;
  code: string;
  format: "video" | "static";
}

interface TrafegoBatchFormProps {
  mentoriaId: string;
  creatives: CreativeOption[];
}

interface Row {
  id: string;
  date: string;
  value: string;
  creativeId: string; // "" = sem criativo
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function newRow(date?: string, creativeId?: string): Row {
  return {
    id: crypto.randomUUID(),
    date: date ?? todayISO(),
    value: "",
    creativeId: creativeId ?? "",
  };
}

const NONE_VALUE = "__none__";

export function TrafegoBatchForm({
  mentoriaId,
  creatives,
}: TrafegoBatchFormProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [submitting, setSubmitting] = useState(false);

  function addRow() {
    const last = rows[rows.length - 1];
    setRows([...rows, newRow(last?.date, last?.creativeId)]);
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

    const entries: {
      value: number;
      captured_at: string;
      creative_id?: string | null;
    }[] = [];
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
        captured_at: row.date,
        creative_id: row.creativeId || null,
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
        <div className="hidden grid-cols-[160px_160px_220px_40px] gap-2 text-[11px] font-medium uppercase text-muted-foreground sm:grid">
          <Label>Data</Label>
          <Label>Valor (R$)</Label>
          <Label>Criativo (opcional)</Label>
          <span />
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[160px_160px_220px_40px]"
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
              value={row.creativeId === "" ? NONE_VALUE : row.creativeId}
              onValueChange={(v) =>
                updateRow(row.id, { creativeId: v === NONE_VALUE ? "" : v })
              }
              disabled={creatives.length === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue
                  placeholder={
                    creatives.length === 0
                      ? "Sem criativos cadastrados"
                      : "Sem criativo"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sem criativo</SelectItem>
                {creatives.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} · {c.format === "video" ? "Vídeo" : "Estático"}
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
