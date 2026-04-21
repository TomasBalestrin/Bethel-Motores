import { Megaphone } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listProfilesWithStats } from "@/services/social-profiles.service";
import { ProfileSelectionCard } from "@/components/social-selling/ProfileSelectionCard";
import { EmptyState } from "@/components/shared/EmptyState";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Social Selling" };

export default async function SocialSellingPage() {
  const supabase = await createClient();
  const profiles = await listProfilesWithStats(supabase).catch(() => []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Social Selling
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecione um perfil para acessar criativos e tarefas.
        </p>
      </header>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhum perfil ativo"
          description="Admin ou Infra pode cadastrar perfis nas configurações."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileSelectionCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
