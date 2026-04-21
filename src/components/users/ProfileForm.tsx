"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/types/user";

interface ProfileFormProps {
  profile: UserProfile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(profile.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          avatar_url: avatarUrl.trim() || null,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Erro ao salvar"
        );
      }
      toast.success("Perfil atualizado");
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
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={profile.email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          O email é gerenciado pelo Supabase Auth e não pode ser alterado aqui.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="profile-name">Nome</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Seu nome completo"
          maxLength={120}
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
        <p className="text-xs text-muted-foreground">
          Link público para imagem. Deixe vazio para usar as iniciais.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar alterações"
          )}
        </Button>
      </div>
    </form>
  );
}
