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
  try {
    posts = await listPostsByProfile(supabase, profile.id);
  } catch (error) {
    console.error(
      "[/motors/social-selling/[slug]/criativos] listPostsByProfile failed:",
      error instanceof Error ? error.message : error
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

      <Card className="p-4">
        <PostsTable posts={posts} />
      </Card>
    </div>
  );
}
