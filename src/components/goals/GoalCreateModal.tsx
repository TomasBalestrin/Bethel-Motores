"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GOAL_METRIC_KEYS,
  GOAL_SCOPES,
  type GoalScope,
} from "@/lib/validators/goal";

interface MotorOption {
  id: string;
  name: string;
}
interface MentoriaOption {
  id: string;
  name: string;
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const CURRENT_YEAR = new Date().getUTCFullYear();
const YEAR_OPTIONS = Array.from(
  { length: 6 },
  (_, index) => CURRENT_YEAR - 1 + index
);

export function GoalCreateModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<GoalScope>("motor");
  const [motors, setMotors] = useState<MotorOption[]>([]);
  const [mentorias, setMentorias] = useState<MentoriaOption[]>([]);
  const [motorId, setMotorId] = useState<string>("");
  const [mentoriaId, setMentoriaId] = useState<string>("");
  const [metricKey, setMetricKey] = useState<string>(GOAL_METRIC_KEYS[0]);
  const [targetValue, setTargetValue] = useState<string>("");
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [month, setMonth] = useState<number>(new Date().getUTCMonth() + 1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [motorsRes, mentoriasRes] = await Promise.all([
        supabase
          .from("motors")
          .select("id, name")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("display_order"),
        supabase
          .from("mentorias")
          .select("id, name")
          .is("deleted_at", null)
          .order("scheduled_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setMotors((motorsRes.data ?? []) as MotorOption[]);
      setMentorias((mentoriasRes.data ?? []) as MentoriaOption[]);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numeric = Number(targetValue.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric < 0) {
      toast.error("Valor alvo inválido");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope_type: scope,
          motor_id: scope === "motor" ? motorId : null,
          mentoria_id: scope === "mentoria" ? mentoriaId : null,
          metric_key: metricKey,
          target_value: numeric,
          period_year: year,
          period_month: month,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao criar meta"
        );
      }
      toast.success("Meta criada");
      setOpen(false);
      setTargetValue("");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível criar a meta", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Nova meta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova meta</DialogTitle>
          <DialogDescription>
            Defina alvo por mês × motor ou mentoria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label>Escopo</Label>
            <div className="flex gap-4">
              {GOAL_SCOPES.map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="goal-scope"
                    value={value}
                    checked={scope === value}
                    onChange={() => setScope(value)}
                  />
                  {value === "motor" ? "Motor" : "Mentoria"}
                </label>
              ))}
            </div>
          </div>

          {scope === "motor" ? (
            <div className="space-y-1">
              <Label htmlFor="goal-motor">Motor</Label>
              <Select value={motorId} onValueChange={setMotorId}>
                <SelectTrigger id="goal-motor">
                  <SelectValue placeholder="Selecione um motor" />
                </SelectTrigger>
                <SelectContent>
                  {motors.map((motor) => (
                    <SelectItem key={motor.id} value={motor.id}>
                      {motor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="goal-mentoria">Mentoria</Label>
              <Select value={mentoriaId} onValueChange={setMentoriaId}>
                <SelectTrigger id="goal-mentoria">
                  <SelectValue placeholder="Selecione uma mentoria" />
                </SelectTrigger>
                <SelectContent>
                  {mentorias.map((mentoria) => (
                    <SelectItem key={mentoria.id} value={mentoria.id}>
                      {mentoria.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="goal-metric">Métrica</Label>
            <Select value={metricKey} onValueChange={setMetricKey}>
              <SelectTrigger id="goal-metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_METRIC_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="goal-target">Valor alvo</Label>
            <Input
              id="goal-target"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={targetValue}
              onChange={(event) => setTargetValue(event.target.value)}
              placeholder="200000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="goal-month">Mês</Label>
              <Select
                value={String(month)}
                onValueChange={(value) => setMonth(Number(value))}
              >
                <SelectTrigger id="goal-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((label, index) => (
                    <SelectItem key={label} value={String(index + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="goal-year">Ano</Label>
              <Select
                value={String(year)}
                onValueChange={(value) => setYear(Number(value))}
              >
                <SelectTrigger id="goal-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                "Criar meta"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
