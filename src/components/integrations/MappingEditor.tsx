"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  TARGET_TABLES,
  type IntegrationMapping,
  type MappingTargetTable,
} from "@/lib/validators/integration";

interface MappingField {
  source_path: string;
  target_field: string;
  target_table: MappingTargetTable;
  funnel_field_key?: string;
}

interface MappingEditorProps {
  sourceId: string;
  initialMapping: IntegrationMapping | Record<string, unknown>;
  samplePayload?: Record<string, unknown>;
  detectedPaths: string[];
}

const MENTORIA_METRIC_FIELDS = [
  "leads_grupo",
  "leads_ao_vivo",
  "agendamentos",
  "calls_realizadas",
  "vendas",
  "valor_vendas",
  "valor_entrada",
  "investimento_trafego",
  "investimento_api",
];

function readPath(payload: unknown, path: string): unknown {
  if (!path) return undefined;
  const segments = path.split(".");
  let cursor: unknown = payload;
  for (const segment of segments) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function normalizeMapping(
  raw: IntegrationMapping | Record<string, unknown>
): IntegrationMapping {
  const fallback: IntegrationMapping = { fields: [] };
  if (!raw || typeof raw !== "object") return fallback;
  const candidate = raw as IntegrationMapping;
  return {
    fields: Array.isArray(candidate.fields) ? candidate.fields : [],
    mentoria_id_path: candidate.mentoria_id_path,
    funnel_id_path: candidate.funnel_id_path,
    event_id_path: candidate.event_id_path,
  };
}

export function MappingEditor({
  sourceId,
  initialMapping,
  samplePayload,
  detectedPaths,
}: MappingEditorProps) {
  const router = useRouter();
  const [mapping, setMapping] = useState<IntegrationMapping>(() =>
    normalizeMapping(initialMapping)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMapping(normalizeMapping(initialMapping));
  }, [initialMapping]);

  function updateField<K extends keyof MappingField>(
    index: number,
    key: K,
    value: MappingField[K]
  ) {
    setMapping((prev) => {
      const next = [...prev.fields];
      const current = next[index] ?? {
        source_path: "",
        target_field: "",
        target_table: "mentoria_metrics" as MappingTargetTable,
      };
      next[index] = { ...current, [key]: value };
      return { ...prev, fields: next };
    });
  }

  function addField() {
    setMapping((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          source_path: "",
          target_field: "leads_grupo",
          target_table: "mentoria_metrics",
        },
      ],
    }));
  }

  function removeField(index: number) {
    setMapping((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/integrations/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao salvar mapping"
        );
      }
      toast.success("Mapping salvo");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
    } finally {
      setSaving(false);
    }
  }

  const preview = useMemo(() => {
    if (!samplePayload) return null;
    return mapping.fields.map((field) => ({
      source_path: field.source_path,
      target: `${field.target_table}.${field.target_field}`,
      value: readPath(samplePayload, field.source_path) ?? "—",
    }));
  }, [mapping, samplePayload]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading text-base font-semibold">
              Campos mapeados
            </h3>
            <p className="text-xs text-muted-foreground">
              Defina como cada caminho do payload vira uma coluna de métrica.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addField}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar mapping
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {mapping.fields.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum campo mapeado ainda.
            </p>
          ) : (
            mapping.fields.map((field, index) => (
              <div
                key={index}
                className="grid items-end gap-2 rounded-md border border-border p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
              >
                <div className="space-y-1">
                  <Label className="text-xs">source_path</Label>
                  <Input
                    list={`paths-${sourceId}`}
                    value={field.source_path}
                    onChange={(event) =>
                      updateField(index, "source_path", event.target.value)
                    }
                    placeholder="event.cost"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">target_table</Label>
                  <Select
                    value={field.target_table}
                    onValueChange={(value) =>
                      updateField(
                        index,
                        "target_table",
                        value as MappingTargetTable
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_TABLES.map((table) => (
                        <SelectItem key={table} value={table}>
                          {table}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">target_field</Label>
                  {field.target_table === "mentoria_metrics" ? (
                    <Select
                      value={field.target_field}
                      onValueChange={(value) =>
                        updateField(index, "target_field", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mapear para" />
                      </SelectTrigger>
                      <SelectContent>
                        {MENTORIA_METRIC_FIELDS.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={field.target_field}
                      onChange={(event) =>
                        updateField(index, "target_field", event.target.value)
                      }
                      placeholder="field_key"
                    />
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeField(index)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        <datalist id={`paths-${sourceId}`}>
          {detectedPaths.map((path) => (
            <option key={path} value={path} />
          ))}
        </datalist>
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="font-heading text-base font-semibold">
          Caminhos especiais
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">mentoria_id_path</Label>
            <Input
              list={`paths-${sourceId}`}
              value={mapping.mentoria_id_path ?? ""}
              onChange={(event) =>
                setMapping((prev) => ({
                  ...prev,
                  mentoria_id_path: event.target.value || undefined,
                }))
              }
              placeholder="event.mentoria_id"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">funnel_id_path</Label>
            <Input
              list={`paths-${sourceId}`}
              value={mapping.funnel_id_path ?? ""}
              onChange={(event) =>
                setMapping((prev) => ({
                  ...prev,
                  funnel_id_path: event.target.value || undefined,
                }))
              }
              placeholder="event.funnel_id"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">event_id_path</Label>
            <Input
              list={`paths-${sourceId}`}
              value={mapping.event_id_path ?? ""}
              onChange={(event) =>
                setMapping((prev) => ({
                  ...prev,
                  event_id_path: event.target.value || undefined,
                }))
              }
              placeholder="event.id"
            />
          </div>
        </div>
      </Card>

      {samplePayload && preview ? (
        <Card className="space-y-2 p-5">
          <h3 className="font-heading text-base font-semibold">
            Preview com último evento
          </h3>
          <p className="text-xs text-muted-foreground">
            Se este payload chegasse agora, o mapping resultaria em:
          </p>
          <ul className="space-y-1 text-xs">
            {preview.length === 0 ? (
              <li className="text-muted-foreground">Sem mappings definidos.</li>
            ) : (
              preview.map((row, index) => (
                <li
                  key={`${row.source_path}-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-2 py-1"
                >
                  <code className="text-muted-foreground">
                    {row.source_path || "—"}
                  </code>
                  <span className="text-muted-foreground">→</span>
                  <code className="text-primary">{row.target}</code>
                  <span className="text-muted-foreground">=</span>
                  <span className="font-medium">
                    {typeof row.value === "object"
                      ? JSON.stringify(row.value)
                      : String(row.value)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
