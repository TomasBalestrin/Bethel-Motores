"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MentoriaWithMetrics } from "@/types/mentoria";

interface MentoriaMetricsDrawerProps {
  mentoriaId: string;
  current: MentoriaWithMetrics | null;
}

const INTEGER_FIELDS = [
  { key: "leads_grupo", label: "Leads no Grupo" },
  { key: "leads_ao_vivo", label: "Leads Ao Vivo" },
  { key: "agendamentos", label: "Agendamentos" },
  { key: "calls_realizadas", label: "Calls Realizadas" },
  { key: "vendas", label: "Vendas" },
] as const;

const CURRENCY_FIELDS = [
  { key: "valor_vendas", label: "Valor Vendas (R$)" },
  { key: "valor_entrada", label: "Valor Entrada (R$)" },
  { key: "investimento_trafego", label: "Investimento Tráfego (R$)" },
  { key: "investimento_api", label: "Investimento API (R$)" },
] as const;

type FieldKey =
  | (typeof INTEGER_FIELDS)[number]["key"]
  | (typeof CURRENCY_FIELDS)[number]["key"];

type FormState = Record<FieldKey, string>;

function emptyState(): FormState {
  return {
    leads_grupo: "",
    leads_ao_vivo: "",
    agendamentos: "",
    calls_realizadas: "",
    vendas: "",
    valor_vendas: "",
    valor_entrada: "",
    investimento_trafego: "",
    investimento_api: "",
  };
}

function seedFromCurrent(current: MentoriaWithMetrics | null): FormState {
  if (!current || current.sem_debriefing) return emptyState();
  return {
    leads_grupo: String(current.leads_grupo ?? 0),
    leads_ao_vivo: String(current.leads_ao_vivo ?? 0),
    agendamentos: String(current.agendamentos ?? 0),
    calls_realizadas: String(current.calls_realizadas ?? 0),
    vendas: String(current.vendas ?? 0),
    valor_vendas: String(current.valor_vendas ?? 0),
    valor_entrada: String(current.valor_entrada ?? 0),
    investimento_trafego: String(current.investimento_trafego ?? 0),
    investimento_api: String(current.investimento_api ?? 0),
  };
}

export function MentoriaMetricsDrawer({
  mentoriaId,
  current,
}: MentoriaMetricsDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => seedFromCurrent(current));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(seedFromCurrent(current));
  }, [open, current]);

  function setField(key: FieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const toInt = (value: string) => {
      const parsed = Number(value || "0");
      return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
    };
    const toDecimal = (value: string) => {
      const parsed = Number((value || "0").replace(",", "."));
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    };

    const payload = {
      leads_grupo: toInt(form.leads_grupo),
      leads_ao_vivo: toInt(form.leads_ao_vivo),
      agendamentos: toInt(form.agendamentos),
      calls_realizadas: toInt(form.calls_realizadas),
      vendas: toInt(form.vendas),
      valor_vendas: toDecimal(form.valor_vendas),
      valor_entrada: toDecimal(form.valor_entrada),
      investimento_trafego: toDecimal(form.investimento_trafego),
      investimento_api: toDecimal(form.investimento_api),
    };

    setSubmitting(true);
    try {
      const response = await fetch(`/api/mentorias/${mentoriaId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body?.error === "string" ? body.error : "Erro ao salvar"
        );
      }
      toast.success("Métricas atualizadas", {
        description: "Uma nova snapshot foi registrada",
      });
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

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">
          <RefreshCcw className="mr-1 h-4 w-4" />
          Atualizar métricas
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Atualizar métricas da mentoria</DrawerTitle>
          <DrawerDescription>
            Esta atualização cria uma nova snapshot; o histórico é preservado.
          </DrawerDescription>
        </DrawerHeader>

        <form
          id="mentoria-metrics-form"
          onSubmit={handleSubmit}
          className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto px-4 pb-2 sm:grid-cols-2"
        >
          {INTEGER_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={`metric-${field.key}`}>{field.label}</Label>
              <Input
                id={`metric-${field.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={form[field.key]}
                onChange={(event) => setField(field.key, event.target.value)}
              />
            </div>
          ))}
          {CURRENCY_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={`metric-${field.key}`}>{field.label}</Label>
              <Input
                id={`metric-${field.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form[field.key]}
                onChange={(event) => setField(field.key, event.target.value)}
              />
            </div>
          ))}
        </form>

        <DrawerFooter className="flex-row justify-end gap-2">
          <DrawerClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Cancelar
            </Button>
          </DrawerClose>
          <Button
            type="submit"
            form="mentoria-metrics-form"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar snapshot"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
