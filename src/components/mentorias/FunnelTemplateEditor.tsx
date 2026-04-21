"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type {
  FunnelTemplate,
  FunnelTemplateField,
} from "@/types/funnel";
import { FunnelFieldEditor } from "./FunnelFieldEditor";

interface FunnelTemplateEditorProps {
  template: FunnelTemplate;
}

interface SortableFieldProps {
  field: FunnelTemplateField;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableField({ field, onEdit, onDelete }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-card p-3",
        isDragging && "border-primary/40 shadow-sm"
      )}
    >
      <button
        type="button"
        aria-label="Arrastar para reordenar"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium">{field.label}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {field.field_key}
          </code>
        </div>
        <p className="text-xs text-muted-foreground">
          {field.field_type} · fonte {field.default_source}
          {field.is_required ? " · obrigatório" : ""}
          {field.is_aggregable ? " · agregável" : ""}
        </p>
      </div>
      <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onDelete}
        aria-label="Remover"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </li>
  );
}

export function FunnelTemplateEditor({ template }: FunnelTemplateEditorProps) {
  const router = useRouter();
  const [fields, setFields] = useState<FunnelTemplateField[]>(template.fields);
  const [templateForm, setTemplateForm] = useState({
    name: template.name,
    description: template.description ?? "",
    is_default: template.is_default,
  });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    field: FunnelTemplateField;
    warning?: string;
    snapshots?: number;
  } | null>(null);
  const [editingField, setEditingField] = useState<FunnelTemplateField | null>(
    null
  );
  const [fieldEditorOpen, setFieldEditorOpen] = useState(false);

  useEffect(() => {
    setFields(template.fields);
  }, [template.fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function saveTemplate() {
    setSavingTemplate(true);
    try {
      const response = await fetch(`/api/funnel-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: {
            name: templateForm.name.trim(),
            description: templateForm.description.trim() || null,
            is_default: templateForm.is_default,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Erro ao salvar template");
      }
      toast.success("Template atualizado");
      refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
    } finally {
      setSavingTemplate(false);
    }
  }

  async function persistReorder(next: FunnelTemplateField[]) {
    const reorder = next.map((field, index) => ({
      id: field.id,
      display_order: index + 1,
    }));
    try {
      const response = await fetch(`/api/funnel-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Erro ao reordenar");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar a ordem", {
        description: message,
      });
      refresh();
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(fields, oldIndex, newIndex);
    setFields(next);
    void persistReorder(next);
  }

  async function handleDelete(
    field: FunnelTemplateField,
    confirmEvenWithSnapshots = false
  ) {
    try {
      const response = await fetch(`/api/funnel-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deleteField: {
            id: field.id,
            confirmEvenWithSnapshots,
          },
        }),
      });

      if (response.status === 409) {
        const payload = await response.json().catch(() => ({}));
        setPendingDelete({
          field,
          warning: payload?.warning,
          snapshots: payload?.snapshots,
        });
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Erro ao remover campo");
      }

      toast.success("Campo removido");
      setPendingDelete(null);
      refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível remover", { description: message });
    }
  }

  function openNewField() {
    setEditingField(null);
    setFieldEditorOpen(true);
  }

  function openEditField(field: FunnelTemplateField) {
    setEditingField(field);
    setFieldEditorOpen(true);
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="font-heading text-lg font-semibold">Dados gerais</h2>
        <div className="space-y-1">
          <Label htmlFor="template-name">Nome</Label>
          <Input
            id="template-name"
            value={templateForm.name}
            onChange={(event) =>
              setTemplateForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="template-description">Descrição</Label>
          <Input
            id="template-description"
            value={templateForm.description}
            onChange={(event) =>
              setTemplateForm((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <Label htmlFor="template-default">Template padrão</Label>
            <p className="text-xs text-muted-foreground">
              Usado ao criar funis sem template explícito
            </p>
          </div>
          <Switch
            id="template-default"
            checked={templateForm.is_default}
            onCheckedChange={(checked) =>
              setTemplateForm((prev) => ({ ...prev, is_default: checked }))
            }
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={saveTemplate} disabled={savingTemplate}>
            {savingTemplate ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar template"
            )}
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-semibold">Campos</h2>
            <p className="text-xs text-muted-foreground">
              Arraste para reordenar. Snapshots históricos guardam chave como
              TEXT — remover campo não apaga snapshots.
            </p>
          </div>
          <Button variant="outline" onClick={openNewField}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar campo
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum campo configurado ainda.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {fields.map((field) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    onEdit={() => openEditField(field)}
                    onDelete={() => handleDelete(field)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </Card>

      <FunnelFieldEditor
        templateId={template.id}
        open={fieldEditorOpen}
        onOpenChange={(open) => {
          setFieldEditorOpen(open);
          if (!open) setEditingField(null);
        }}
        field={editingField}
        keyLocked={Boolean(editingField)}
        onSaved={refresh}
      />

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="max-w-md space-y-3 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <h3 className="font-heading text-base font-semibold">
                  Remover campo &ldquo;{pendingDelete.field.label}&rdquo;?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pendingDelete.warning ??
                    "Este campo possui snapshots — o campo ficará oculto mas os snapshots históricos são preservados."}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(pendingDelete.field, true)}
              >
                Remover mesmo assim
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
