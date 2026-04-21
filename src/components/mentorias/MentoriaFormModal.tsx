"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  mentoriaCreateSchema,
  type MentoriaCreateInput,
} from "@/lib/validators/mentoria";
import { useCreateMentoria } from "@/hooks/useMentorias";
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

interface Specialist {
  id: string;
  name: string;
}

export function MentoriaFormModal() {
  const [open, setOpen] = useState(false);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const createMutation = useCreateMentoria();

  const form = useForm<MentoriaCreateInput>({
    resolver: zodResolver(mentoriaCreateSchema),
    defaultValues: {
      name: "",
      scheduled_at: "",
      specialist_id: "",
      traffic_budget: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoadingSpecialists(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("social_profiles")
        .select("id, name")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .returns<Specialist[]>();
      if (!cancelled) {
        setSpecialists(data ?? []);
        setLoadingSpecialists(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function onSubmit(input: MentoriaCreateInput) {
    try {
      await createMutation.mutateAsync({
        ...input,
        scheduled_at: new Date(input.scheduled_at).toISOString(),
      });
      toast.success("Mentoria criada");
      form.reset();
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível criar a mentoria", { description: message });
    }
  }

  const isSubmitting = form.formState.isSubmitting || createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Nova Mentoria
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Mentoria</DialogTitle>
          <DialogDescription>
            Cadastre uma nova mentoria do motor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Lançamento Maio 2026" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="scheduled_at">Data e horário</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              {...form.register("scheduled_at")}
            />
            {form.formState.errors.scheduled_at ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.scheduled_at.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="specialist_id">Especialista</Label>
            <Select
              value={form.watch("specialist_id") || ""}
              onValueChange={(value) =>
                form.setValue("specialist_id", value, { shouldValidate: true })
              }
            >
              <SelectTrigger id="specialist_id">
                <SelectValue
                  placeholder={
                    loadingSpecialists
                      ? "Carregando..."
                      : "Selecione um especialista"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {specialists.map((specialist) => (
                  <SelectItem key={specialist.id} value={specialist.id}>
                    {specialist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.specialist_id ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.specialist_id.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="traffic_budget">Orçamento de tráfego (R$)</Label>
            <Input
              id="traffic_budget"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="Opcional"
              {...form.register("traffic_budget", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined
                    ? null
                    : Number(value),
              })}
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
                "Criar mentoria"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
