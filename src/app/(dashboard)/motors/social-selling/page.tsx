import type { Metadata } from "next";
import { Megaphone } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listProfilesWithStats } from "@/services/social-profiles.service";
import { getUserProfile } from "@/services/users.service";
import { ProfileSelectionCard } from "@/components/social-selling/ProfileSelectionCard";
import { SocialProfileCreateModal } from "@/components/social-selling/SocialProfileCreateModal";
import { EmptyState } from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Social Selling" };

export default async function SocialSellingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profiles, profile, motorRow] = await Promise.all([
    listProfilesWithStats(supabase).catch(() => []),
    user ? getUserProfile(supabase, user.id) : Promise.resolve(null),
    supabase
      .from("motors")
      .select("id")
      .eq("slug", "social-selling")
      .maybeSingle<{ id: string }>()
      .then((result) => result.data),
  ]);

  const canManage =
    profile?.role === "admin" || profile?.role === "gestor_infra";
  const motorId = motorRow?.id ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Social Selling
          </h1>
          <p className="text-sm text-muted-foreground">
            Selecione um perfil para acessar criativos e tarefas.
          </p>
        </div>
        {canManage && motorId ? (
          <SocialProfileCreateModal motorId={motorId} />
        ) : null}
      </header>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhum perfil ativo"
          description={
            canManage
              ? "Cadastre o primeiro perfil em “Novo perfil”."
              : "Admin ou Infra pode cadastrar perfis."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profileRow) => (
            <ProfileSelectionCard key={profileRow.id} profile={profileRow} />
          ))}
        </div>
      )}
    </div>
  );
}
