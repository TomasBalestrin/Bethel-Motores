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

interface SocialProfileCreateModalProps {
  motorId: string;
}

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

export function SocialProfileCreateModal({
  motorId,
}: SocialProfileCreateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [instagram, setInstagram] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalSlug = sanitizeSlug(slug || name);
    if (!finalSlug) {
      toast.error("Slug inválido");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/social-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motor_id: motorId,
          slug: finalSlug,
          name: name.trim(),
          instagram_handle: instagram.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body?.error === "string" ? body.error : "Erro ao criar perfil"
        );
      }
      toast.success("Perfil criado");
      setName("");
      setSlug("");
      setInstagram("");
      setAvatarUrl("");
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Não foi possível criar", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Novo perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo perfil de Social Selling</DialogTitle>
          <DialogDescription>
            O perfil fica disponível para cadastro de posts e tarefas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Cleiton Querobin"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="profile-slug">Slug</Label>
            <Input
              id="profile-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="cleiton"
            />
            <p className="text-xs text-muted-foreground">
              Usado na URL <code>/motors/social-selling/[slug]</code>. Deixe
              vazio para gerar do nome.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="profile-instagram">Instagram</Label>
            <Input
              id="profile-instagram"
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              placeholder="@cleitonquerobin"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="profile-avatar">Avatar (URL)</Label>
            <Input
              id="profile-avatar"
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://..."
            />
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
                  Salvando...
                </>
              ) : (
                "Criar perfil"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
