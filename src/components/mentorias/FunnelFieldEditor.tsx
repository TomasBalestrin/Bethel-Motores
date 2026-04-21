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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  FIELD_TYPES,
  METRIC_SOURCES,
  type FieldType,
  type MetricSource,
} from "@/lib/validators/funnel";
import type { FunnelTemplateField } from "@/types/funnel";

export interface FieldEditorPayload {
  field_key: string;
  label: string;
  field_type: FieldType;
  default_source: MetricSource;
  is_required: boolean;
  is_aggregable: boolean;
  unit: string | null;
}

interface FunnelFieldEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  field: FunnelTemplateField | null;
  keyLocked?: boolean;
  onSaved?: () => void;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  number: "Número",
  currency: "Moeda (R$)",
  percentage: "Percentual",
  url: "URL",
  text: "Texto",
};

const METRIC_SOURCE_LABELS: Record<MetricSource, string> = {
  manual: "Manual",
  webhook: "Webhook",
  api: "API",
};

function sanitizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 64);
}

export function FunnelFieldEditor({
  open,
  onOpenChange,
  templateId,
  field,
  keyLocked = false,
  onSaved,
}: FunnelFieldEditorProps) {
  const [form, setForm] = useState<FieldEditorPayload>({
    field_key: "",
    label: "",
    field_type: "number",
    default_source: "manual",
    is_required: false,
    is_aggregable: true,
    unit: null,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (field) {
      setForm({
        field_key: field.field_key,
        label: field.label,
        field_type: field.field_type,
        default_source: field.default_source,
        is_required: field.is_required,
        is_aggregable: field.is_aggregable,
        unit: field.unit,
      });
    } else {
      setForm({
        field_key: "",
        label: "",
        field_type: "number",
        default_source: "manual",
        is_required: false,
        is_aggregable: true,
        unit: null,
      });
    }
  }, [open, field]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const key = sanitizeKey(form.field_key);
    if (!key) {
      toast.error("Key inválida", { description: "Use a-z, 0-9 e _" });
      return;
    }

    setSubmitting(true);
    try {
      const body = field
        ? {
            updateField: {
              id: field.id,
              label: form.label,
              field_type: form.field_type,
              default_source: form.default_source,
              is_required: form.is_required,
              is_aggregable: form.is_aggregable,
              unit: form.unit,
            },
          }
        : {
            addField: {
              field_key: key,
              label: form.label,
              field_type: form.field_type,
              default_source: form.default_source,
              is_required: form.is_required,
              is_aggregable: form.is_aggregable,
              unit: form.unit,
            },
          };

      const response = await fetch(`/api/funnel-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Erro ao salvar campo");
      }
      toast.success(field ? "Campo atualizado" : "Campo adicionado");
      onSaved?.();
      onOpenChange(false);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {field ? `Editar campo: ${field.label}` : "Novo campo"}
          </DialogTitle>
          <DialogDescription>
            Campos com snapshots preservam histórico mesmo após alterações de
            template.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="field-key">Chave (key)</Label>
            <Input
              id="field-key"
              value={form.field_key}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  field_key: event.target.value,
                }))
              }
              disabled={keyLocked}
              placeholder="ex: leads_qualificados"
            />
            {keyLocked ? (
              <p className="text-xs text-muted-foreground">
                Chave bloqueada — campo possui snapshots.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Use a-z, 0-9 e _. Será usada em snapshots históricos.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              value={form.label}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, label: event.target.value }))
              }
              placeholder="Leads Qualificados"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="field-type">Tipo</Label>
              <Select
                value={form.field_type}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    field_type: value as FieldType,
                  }))
                }
              >
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {FIELD_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="field-source">Fonte padrão</Label>
              <Select
                value={form.default_source}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    default_source: value as MetricSource,
                  }))
                }
              >
                <SelectTrigger id="field-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {METRIC_SOURCE_LABELS[source]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label htmlFor="field-required">Obrigatório</Label>
              <p className="text-xs text-muted-foreground">
                Usuário deve preencher ao editar
              </p>
            </div>
            <Switch
              id="field-required"
              checked={form.is_required}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, is_required: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label htmlFor="field-aggregable">Agregável</Label>
              <p className="text-xs text-muted-foreground">
                Pode ser somado em comparações
              </p>
            </div>
            <Switch
              id="field-aggregable"
              checked={form.is_aggregable}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, is_aggregable: checked }))
              }
            />
          </div>

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
              ) : field ? (
                "Salvar alterações"
              ) : (
                "Adicionar campo"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
