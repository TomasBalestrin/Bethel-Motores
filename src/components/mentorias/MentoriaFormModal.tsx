"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  mentoriaCreateSchema,
  type MentoriaCreateInput,
} from "@/lib/validators/mentoria";
import {
  useCreateMentoria,
  useUpdateMentoria,
} from "@/hooks/useMentorias";
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

interface EditTarget {
  id: string;
  name: string;
  scheduled_at: string;
  specialist_id: string;
  traffic_budget: number | null;
}

interface MentoriaFormModalProps {
  mode?: "create" | "edit";
  mentoria?: EditTarget;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function isoToDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function MentoriaFormModal({
  mode = "create",
  mentoria,
  trigger,
  open: openProp,
  onOpenChange,
}: MentoriaFormModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const createMutation = useCreateMentoria();
  const updateMutation = useUpdateMentoria();

  const defaults: MentoriaCreateInput =
    mode === "edit" && mentoria
      ? {
          name: mentoria.name,
          scheduled_at: isoToDatetimeLocal(mentoria.scheduled_at),
          specialist_id: mentoria.specialist_id,
          traffic_budget: mentoria.traffic_budget,
        }
      : {
          name: "",
          scheduled_at: "",
          specialist_id: "",
          traffic_budget: null,
        };

  const form = useForm<MentoriaCreateInput>({
    resolver: zodResolver(mentoriaCreateSchema),
    defaultValues: defaults,
  });

  function setOpen(next: boolean) {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  }

  useEffect(() => {
    if (open) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mentoria?.id]);

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
    const payload = {
      name: input.name,
      scheduled_at: new Date(input.scheduled_at).toISOString(),
      specialist_id: input.specialist_id,
      traffic_budget: input.traffic_budget ?? null,
    };

    try {
      if (mode === "edit" && mentoria) {
        await updateMutation.mutateAsync({ id: mentoria.id, patch: payload });
        toast.success("Mentoria atualizada");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Mentoria criada");
      }
      form.reset();
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(
        mode === "edit"
          ? "Não foi possível salvar"
          : "Não foi possível criar a mentoria",
        { description: message }
      );
    }
  }

  const isSubmitting =
    form.formState.isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending;

  const defaultTrigger =
    mode === "create" ? (
      <Button>
        <Plus className="mr-1 h-4 w-4" />
        Nova Mentoria
      </Button>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : defaultTrigger ? (
        <DialogTrigger asChild>{defaultTrigger}</DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar mentoria" : "Nova Mentoria"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Atualize os dados desta mentoria."
              : "Cadastre uma nova mentoria do motor."}
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
              ) : mode === "edit" ? (
                "Salvar alterações"
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
