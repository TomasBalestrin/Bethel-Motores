import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  getProfileBySlug,
  listPostsByProfile,
  type ProfilePost,
} from "@/services/social-profiles.service";
import { Card } from "@/components/ui/card";
import { PostCreateModal } from "@/components/social-selling/PostCreateModal";
import { PostsTable } from "@/components/social-selling/PostsTable";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { profileSlug: string };
}

export default async function CriativosPage({ params }: PageProps) {
  const supabase = await createClient();
  const profile = await getProfileBySlug(supabase, params.profileSlug);
  if (!profile) notFound();

  let posts: ProfilePost[] = [];
  let loadError: string | null = null;
  try {
    posts = await listPostsByProfile(supabase, profile.id);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">Criativos</h2>
          <p className="text-xs text-muted-foreground">
            {posts.length === 1
              ? "1 post cadastrado"
              : `${posts.length} posts cadastrados`}
          </p>
        </div>
        <PostCreateModal profileId={profile.id} />
      </div>

      {loadError ? (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold">Erro ao carregar posts</p>
          <p className="mt-1 break-all font-mono text-xs">{loadError}</p>
        </Card>
      ) : null}

      <Card className="p-4">
        <PostsTable posts={posts} />
      </Card>
    </div>
  );
}
