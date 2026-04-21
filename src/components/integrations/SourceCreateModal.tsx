"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  INTEGRATION_TYPES,
  type IntegrationType,
} from "@/lib/validators/integration";
import { SecretDisplayModal } from "./SecretDisplayModal";

const TYPE_LABELS: Record<IntegrationType, string> = {
  fluxon: "Fluxon (WhatsApp)",
  meta_ads: "Meta Ads",
  generic: "Webhook genérico",
};

const DEFAULT_MAPPING_BY_TYPE: Record<IntegrationType, unknown> = {
  fluxon: {
    fields: [
      {
        source_path: "event.cost",
        target_field: "investimento_api",
        target_table: "mentoria_metrics",
      },
      {
        source_path: "event.volume",
        target_field: "leads_grupo",
        target_table: "mentoria_metrics",
      },
    ],
    mentoria_id_path: "event.mentoria_id",
    event_id_path: "event.id",
  },
  meta_ads: {
    fields: [
      {
        source_path: "data.spend",
        target_field: "investimento_trafego",
        target_table: "mentoria_metrics",
      },
    ],
    mentoria_id_path: "data.mentoria_id",
    event_id_path: "data.id",
  },
  generic: {
    fields: [
      {
        source_path: "value",
        target_field: "investimento_trafego",
        target_table: "mentoria_metrics",
      },
    ],
    mentoria_id_path: "mentoria_id",
  },
};

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

export function SourceCreateModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<IntegrationType>("fluxon");
  const [secretPayload, setSecretPayload] = useState<{
    slug: string;
    secret: string;
  } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalSlug = sanitizeSlug(slug || name);
    if (!finalSlug) {
      toast.error("Slug inválido");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/integrations/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: finalSlug,
          name: name.trim(),
          type,
          mapping: DEFAULT_MAPPING_BY_TYPE[type],
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao criar fonte"
        );
      }
      const payload = (await response.json()) as {
        data: { id: string; slug: string; secret: string };
      };
      toast.success("Fonte criada");
      setSecretPayload({ slug: payload.data.slug, secret: payload.data.secret });
      setOpen(false);
      setName("");
      setSlug("");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível criar a fonte", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            Nova fonte
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova fonte de integração</DialogTitle>
            <DialogDescription>
              Após criar, o secret será exibido uma única vez.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1">
              <Label htmlFor="source-name">Nome</Label>
              <Input
                id="source-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Fluxon — WhatsApp"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="source-slug">Slug</Label>
              <Input
                id="source-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="fluxon"
              />
              <p className="text-xs text-muted-foreground">
                Usado em <code>/api/webhooks/[slug]</code>. Deixe vazio
                para gerar a partir do nome.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="source-type">Tipo</Label>
              <Select
                value={type}
                onValueChange={(next) => setType(next as IntegrationType)}
              >
                <SelectTrigger id="source-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEGRATION_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    Criando...
                  </>
                ) : (
                  "Criar fonte"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SecretDisplayModal
        open={secretPayload !== null}
        slug={secretPayload?.slug ?? null}
        secret={secretPayload?.secret ?? null}
        onOpenChange={(next) => {
          if (!next) setSecretPayload(null);
        }}
      />
    </>
  );
}
