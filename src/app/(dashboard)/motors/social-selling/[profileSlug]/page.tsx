import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  getProfileBySlug,
  getProfileDashboardStats,
  listPostsByProfile,
  type ProfileDashboardStats,
  type ProfilePost,
} from "@/services/social-profiles.service";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PostsGrid } from "@/components/social-selling/PostsGrid";

interface PageProps {
  params: { profileSlug: string };
}

function zeroStats(): ProfileDashboardStats {
  return { posts_active: 0, impressions: 0, reach: 0, spend: 0 };
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const parts = [
      obj.message ? String(obj.message) : null,
      obj.code ? `[${String(obj.code)}]` : null,
      obj.details ? String(obj.details) : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" — ") : JSON.stringify(error);
  }
  return String(error);
}

export default async function SocialProfileDashboardPage({ params }: PageProps) {
  const supabase = await createClient();
  const profile = await getProfileBySlug(supabase, params.profileSlug);
  if (!profile) notFound();

  const [statsResult, postsResult] = await Promise.allSettled([
    getProfileDashboardStats(supabase, profile.id),
    listPostsByProfile(supabase, profile.id),
  ]);

  const stats =
    statsResult.status === "fulfilled" ? statsResult.value : zeroStats();
  const posts: ProfilePost[] =
    postsResult.status === "fulfilled" ? postsResult.value : [];

  const errors = [
    statsResult.status === "rejected"
      ? `Stats: ${extractMessage(statsResult.reason)}`
      : null,
    postsResult.status === "rejected"
      ? `Posts: ${extractMessage(postsResult.reason)}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      {errors.length > 0 ? (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold">Erro ao carregar dashboard</p>
          {errors.map((err, i) => (
            <p key={i} className="mt-1 break-all font-mono text-xs">
              {err}
            </p>
          ))}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Posts ativos"
          value={stats.posts_active}
          format="integer"
        />
        <MetricCard
          label="Impressões (último snapshot)"
          value={stats.impressions}
          format="integer"
        />
        <MetricCard
          label="Alcance (último snapshot)"
          value={stats.reach}
          format="integer"
        />
        <MetricCard label="Gasto total" value={stats.spend} format="currency" />
      </div>

      <section className="space-y-2">
        <h2 className="font-heading text-lg font-semibold">Posts recentes</h2>
        <PostsGrid posts={posts} />
      </section>
    </div>
  );
}
