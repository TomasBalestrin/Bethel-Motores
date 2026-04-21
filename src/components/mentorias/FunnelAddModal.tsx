"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import {
  funnelCreateSchema,
  type FunnelCreateInput,
} from "@/lib/validators/funnel";
import { useCreateFunnel, useFunnelTemplates } from "@/hooks/useFunnels";

interface FunnelAddModalProps {
  mentoriaId: string;
}

export function FunnelAddModal({ mentoriaId }: FunnelAddModalProps) {
  const [open, setOpen] = useState(false);
  const templatesQuery = useFunnelTemplates();
  const createMutation = useCreateFunnel(mentoriaId);

  const form = useForm<FunnelCreateInput>({
    resolver: zodResolver(funnelCreateSchema),
    defaultValues: {
      name: "",
      template_id: "",
      list_url: null,
      is_traffic_funnel: false,
    },
  });

  async function onSubmit(input: FunnelCreateInput) {
    try {
      await createMutation.mutateAsync(input);
      toast.success("Funil adicionado");
      form.reset();
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível criar o funil", { description: message });
    }
  }

  const isSubmitting = form.formState.isSubmitting || createMutation.isPending;
  const templates = templatesQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          Adicionar Funil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Funil</DialogTitle>
          <DialogDescription>
            Escolha um template para iniciar o funil desta mentoria.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor="funnel-name">Nome</Label>
            <Input
              id="funnel-name"
              placeholder="Funil Orgânico Julia"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="funnel-template">Template</Label>
            <Select
              value={form.watch("template_id") || ""}
              onValueChange={(value) =>
                form.setValue("template_id", value, { shouldValidate: true })
              }
            >
              <SelectTrigger id="funnel-template">
                <SelectValue
                  placeholder={
                    templatesQuery.isLoading
                      ? "Carregando..."
                      : "Selecione um template"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.is_default ? " (padrão)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.template_id ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.template_id.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="funnel-list-url">Link da Lista</Label>
            <Input
              id="funnel-list-url"
              type="url"
              placeholder="https://..."
              {...form.register("list_url", {
                setValueAs: (value) =>
                  value === "" || value == null ? null : String(value),
              })}
            />
            {form.formState.errors.list_url ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.list_url.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="funnel-traffic">Funil de tráfego?</Label>
              <p className="text-xs text-muted-foreground">
                Agrega em &ldquo;Captação Tráfego Total&rdquo; do motor
              </p>
            </div>
            <Switch
              id="funnel-traffic"
              checked={Boolean(form.watch("is_traffic_funnel"))}
              onCheckedChange={(value) =>
                form.setValue("is_traffic_funnel", value, {
                  shouldValidate: true,
                })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Criar funil"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
