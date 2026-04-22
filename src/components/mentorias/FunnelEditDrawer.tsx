"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock } from "lucide-react";
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
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTimeBR } from "@/lib/utils/format";
import { useSaveFunnelSnapshot } from "@/hooks/useFunnels";
import type {
  FunnelFieldValue,
  FunnelTemplateField,
  FunnelWithTemplate,
} from "@/types/funnel";

interface FunnelEditDrawerProps {
  mentoriaId: string;
  funnel: FunnelWithTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function valueToInput(
  field: FunnelTemplateField,
  current: FunnelFieldValue | undefined
): string {
  if (!current) return "";
  if (field.field_type === "url" || field.field_type === "text") {
    return current.value_text ?? "";
  }
  if (current.value_numeric == null) return "";
  return String(current.value_numeric);
}

function inputToPayload(field: FunnelTemplateField, raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (field.field_type === "url" || field.field_type === "text") {
    return trimmed;
  }
  const parsed = Number(trimmed.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function FunnelEditDrawer({
  mentoriaId,
  funnel,
  open,
  onOpenChange,
}: FunnelEditDrawerProps) {
  const mutation = useSaveFunnelSnapshot(mentoriaId);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const fields = useMemo(
    () => funnel?.template?.fields ?? [],
    [funnel]
  );
  const valueMap = useMemo(() => {
    const map = new Map<string, FunnelFieldValue>();
    for (const value of funnel?.values ?? []) {
      map.set(value.field_key, value);
    }
    return map;
  }, [funnel]);

  useEffect(() => {
    if (!open || !funnel) return;
    const next: Record<string, string> = {};
    for (const field of fields) {
      next[field.field_key] = valueToInput(field, valueMap.get(field.field_key));
    }
    setFormValues(next);
  }, [open, funnel, fields, valueMap]);

  if (!funnel) return null;

  const lastCapturedAt = funnel.values
    .map((value) => value.captured_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: Record<string, number | string | null> = {};
    for (const field of fields) {
      if (field.default_source !== "manual") continue;
      payload[field.field_key] = inputToPayload(
        field,
        formValues[field.field_key] ?? ""
      );
    }

    try {
      await mutation.mutateAsync({
        funnelId: funnel!.id,
        input: { values: payload },
      });
      toast.success("Indicadores atualizados", {
        description: "Uma nova snapshot foi registrada",
      });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Editar indicadores · {funnel.name}</DrawerTitle>
          <DrawerDescription>
            {lastCapturedAt
              ? `Última atualização ${formatDateTimeBR(lastCapturedAt)}`
              : "Nenhuma snapshot registrada"}
          </DrawerDescription>
        </DrawerHeader>

        <form
          id="funnel-edit-form"
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2"
        >
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este template não tem campos configurados.
            </p>
          ) : (
            fields.map((field) => {
              const current = valueMap.get(field.field_key);
              const source = current?.source ?? field.default_source;
              const locked = source !== "manual";
              const inputType =
                field.field_type === "url"
                  ? "url"
                  : field.field_type === "text"
                    ? "text"
                    : "number";

              return (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`field-${field.field_key}`}>
                      {field.label}
                      {field.is_required ? (
                        <span className="ml-1 text-destructive">*</span>
                      ) : null}
                    </Label>
                    {locked ? (
                      <span
                        title={
                          source === "derived"
                            ? "Derivado da lista de leads"
                            : `Vem automaticamente de ${source}`
                        }
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                      >
                        <Lock className="h-3 w-3" />
                        {source === "derived" ? "lista" : source}
                      </span>
                    ) : null}
                  </div>
                  <Input
                    id={`field-${field.field_key}`}
                    type={inputType}
                    inputMode={
                      field.field_type === "number" ||
                      field.field_type === "currency" ||
                      field.field_type === "percentage"
                        ? "decimal"
                        : undefined
                    }
                    disabled={locked}
                    value={formValues[field.field_key] ?? ""}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [field.field_key]: event.target.value,
                      }))
                    }
                    placeholder={
                      field.field_type === "currency"
                        ? "0,00"
                        : field.field_type === "url"
                          ? "https://"
                          : ""
                    }
                  />
                </div>
              );
            })
          )}
        </form>

        <DrawerFooter className="flex-row justify-end gap-2">
          <DrawerClose asChild>
            <Button variant="ghost" disabled={mutation.isPending}>
              Cancelar
            </Button>
          </DrawerClose>
          <Button
            type="submit"
            form="funnel-edit-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
