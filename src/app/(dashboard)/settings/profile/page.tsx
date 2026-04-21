import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/services/users.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PasswordChangeForm } from "@/components/users/PasswordChangeForm";
import { ProfileForm } from "@/components/users/ProfileForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Perfil" };

function initialsFrom(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (first + last).toUpperCase() || "?";
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  gestor_trafego: "Gestor de Tráfego",
  gestor_infra: "Gestor de Infra",
  copy: "Copy",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile(supabase, user.id);
  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Perfil não encontrado. Tente sair e entrar novamente.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          {profile.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={profile.name ?? profile.email} />
          ) : null}
          <AvatarFallback className="text-base">
            {initialsFrom(profile.name, profile.email)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Perfil
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{profile.email}</span>
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/10 text-[10px] text-primary"
            >
              {ROLE_LABELS[profile.role] ?? profile.role}
            </Badge>
            {!profile.is_active ? (
              <Badge
                variant="outline"
                className="rounded-full border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
              >
                Inativo
              </Badge>
            ) : null}
          </div>
        </div>
      </header>

      <Card className="p-6">
        <ProfileForm profile={profile} />
      </Card>

      <Card className="space-y-3 p-6">
        <div className="space-y-1">
          <h2 className="font-heading text-base font-semibold">Senha</h2>
          <p className="text-xs text-muted-foreground">
            Altere sua senha de acesso. Mínimo 8 caracteres.
          </p>
        </div>
        <PasswordChangeForm />
      </Card>
    </div>
  );
}
