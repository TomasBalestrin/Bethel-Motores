import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  getProfileBySlug,
  listPostsByProfile,
  type ProfilePost,
} from "@/services/social-profiles.service";
import { Card } from "@/components/ui/card";
import { PostCreateModal } from "@/components/social-selling/PostCreateModal";
import { MeetingBulkImportButton } from "@/components/social-selling/MeetingBulkImportButton";
import { PostsTable } from "@/components/social-selling/PostsTable";
import { CriativosSubTabs } from "@/components/social-selling/CriativosSubTabs";
import { ArchiveToggle } from "@/components/social-selling/ArchiveToggle";
import type { PostType } from "@/types/post";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { profileSlug: string };
  searchParams: { tipo?: string; view?: string };
}

function resolveType(tipo: string | undefined): PostType {
  return tipo === "organico" ? "organico" : "impulsionar";
}

function resolveView(view: string | undefined): "ativos" | "arquivados" {
  return view === "arquivados" ? "arquivados" : "ativos";
}

export default async function CriativosPage({
  params,
  searchParams,
}: PageProps) {
  const activeType = resolveType(searchParams.tipo);
  const activeView = resolveView(searchParams.view);
  const supabase = await createClient();
  const profile = await getProfileBySlug(supabase, params.profileSlug);
  if (!profile) notFound();

  let allPosts: ProfilePost[] = [];
  let loadError: string | null = null;
  try {
    allPosts = await listPostsByProfile(supabase, profile.id);
  } catch (error) {
    let message: string;
    if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === "object") {
      const obj = error as Record<string, unknown>;
      const parts = [
        obj.message ? String(obj.message) : null,
        obj.code ? `[${String(obj.code)}]` : null,
        obj.details ? String(obj.details) : null,
        obj.hint ? `hint: ${String(obj.hint)}` : null,
      ].filter(Boolean);
      message = parts.length > 0 ? parts.join(" — ") : JSON.stringify(error);
    } else {
      message = String(error);
    }
    loadError = message;
    console.error(
      "[/motors/social-selling/[slug]/criativos] listPostsByProfile failed:",
      message
    );
  }

  // Contagens para as sub-abas: só posts ativos de cada tipo
  const counts = {
    impulsionar: allPosts.filter(
      (p) => p.post_type === "impulsionar" && p.is_active
    ).length,
    organico: allPosts.filter(
      (p) => p.post_type === "organico" && p.is_active
    ).length,
  };

  // Posts do tipo ativo
  const postsOfType = allPosts.filter((p) => p.post_type === activeType);
  const ativos = postsOfType.filter((p) => p.is_active);
  const arquivados = postsOfType.filter((p) => !p.is_active);
  const filtered = activeView === "arquivados" ? arquivados : ativos;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">Criativos</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length === 1
              ? "1 post"
              : `${filtered.length} posts`}{" "}
            · {activeView === "arquivados" ? "Arquivados" : "Ativos"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MeetingBulkImportButton profileId={profile.id} />
          <PostCreateModal profileId={profile.id} postType={activeType} />
        </div>
      </div>

      <CriativosSubTabs active={activeType} counts={counts} />

      <ArchiveToggle
        view={activeView}
        ativosCount={ativos.length}
        arquivadosCount={arquivados.length}
      />

      {loadError ? (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold">Erro ao carregar posts</p>
          <p className="mt-1 break-all font-mono text-xs">{loadError}</p>
        </Card>
      ) : null}

      <Card className="p-4">
        <PostsTable posts={filtered} postType={activeType} />
      </Card>
    </div>
  );
}
