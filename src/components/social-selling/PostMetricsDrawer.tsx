"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils/format";
import type { ProfilePost } from "@/services/social-profiles.service";

interface PostMetricsDrawerProps {
  post: ProfilePost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELDS = [
  { key: "investment", label: "Investimento (R$)", step: "0.01" },
  { key: "followers_gained", label: "Seguidores ganhos", step: "1" },
  { key: "likes", label: "Curtidas", step: "1" },
  { key: "comments", label: "Comentários", step: "1" },
  { key: "shares", label: "Compartilhamentos", step: "1" },
  { key: "saves", label: "Salvos", step: "1" },
  { key: "reach", label: "Alcance", step: "1" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

type FormState = Record<FieldKey, string>;

const EMPTY_STATE: FormState = {
  investment: "",
  followers_gained: "",
  likes: "",
  comments: "",
  shares: "",
  saves: "",
  reach: "",
};

export function PostMetricsDrawer({
  post,
  open,
  onOpenChange,
}: PostMetricsDrawerProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_STATE);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_STATE);
  }, [open]);

  const costPerFollower = useMemo(() => {
    const investment = Number(form.investment.replace(",", "."));
    const followers = Number(form.followers_gained);
    if (!Number.isFinite(investment) || !Number.isFinite(followers)) return 0;
    if (followers <= 0) return 0;
    return investment / followers;
  }, [form.investment, form.followers_gained]);

  function setField(key: FieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) return;

    const payload: Record<FieldKey, number> = {
      investment: Number(form.investment.replace(",", ".")) || 0,
      followers_gained: Number(form.followers_gained) || 0,
      likes: Number(form.likes) || 0,
      comments: Number(form.comments) || 0,
      shares: Number(form.shares) || 0,
      saves: Number(form.saves) || 0,
      reach: Number(form.reach) || 0,
    };

    setSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/metrics`, {
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
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível salvar", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  if (!post) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Atualizar métricas · {post.code}</DrawerTitle>
          <DrawerDescription>
            Os valores são salvos como nova snapshot; o histórico é preservado.
          </DrawerDescription>
        </DrawerHeader>

        <form
          id="post-metrics-form"
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2"
        >
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={`metric-${field.key}`}>{field.label}</Label>
              <Input
                id={`metric-${field.key}`}
                type="number"
                inputMode="decimal"
                step={field.step}
                min={0}
                value={form[field.key]}
                onChange={(event) => setField(field.key, event.target.value)}
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor="metric-cpf">Custo / Seguidor (calculado)</Label>
            <Input
              id="metric-cpf"
              value={formatCurrency(costPerFollower)}
              disabled
              readOnly
            />
          </div>
        </form>

        <DrawerFooter className="flex-row justify-end gap-2">
          <DrawerClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Cancelar
            </Button>
          </DrawerClose>
          <Button
            type="submit"
            form="post-metrics-form"
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
