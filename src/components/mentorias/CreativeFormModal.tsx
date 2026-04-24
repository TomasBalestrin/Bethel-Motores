"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { CreativeFormat, MentoriaCreative } from "@/services/creatives.service";

interface CreativeFormModalProps {
  mentoriaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  creative?: MentoriaCreative | null;
}

export function CreativeFormModal({
  mentoriaId,
  open,
  onOpenChange,
  mode,
  creative = null,
}: CreativeFormModalProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [format, setFormat] = useState<CreativeFormat>("video");
  const [headline, setHeadline] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && creative) {
        setCode(creative.code);
        setFormat(creative.format);
        setHeadline(creative.headline ?? "");
        setLink(creative.link ?? "");
      } else {
        setCode("");
        setFormat("video");
        setHeadline("");
        setLink("");
      }
    }
  }, [open, mode, creative]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) {
      toast.error("Informe o código");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        code: code.trim(),
        format,
        headline: headline.trim() || null,
        link: link.trim() || null,
      };
      const url =
        mode === "edit" && creative
          ? `/api/creatives/${creative.id}`
          : `/api/mentorias/${mentoriaId}/creatives`;
      const method = mode === "edit" ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao salvar"
        );
      }
      toast.success(mode === "edit" ? "Criativo atualizado" : "Criativo criado");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar criativo" : "Novo criativo"}
          </DialogTitle>
          <DialogDescription>
            Cadastre o código, tipo (vídeo ou estático), headline e link opcional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="creative-code">Código</Label>
              <Input
                id="creative-code"
                placeholder="V1, V2, E1..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="creative-format">Tipo</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as CreativeFormat)}
              >
                <SelectTrigger id="creative-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="static">Estático</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="creative-headline">Headline (opcional)</Label>
            <Input
              id="creative-headline"
              placeholder="Gancho principal do criativo"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="creative-link">Link de preview (opcional)</Label>
            <Input
              id="creative-link"
              type="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
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
              ) : mode === "edit" ? (
                "Salvar alterações"
              ) : (
                "Criar criativo"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
