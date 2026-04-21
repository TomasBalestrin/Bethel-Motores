import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  getProfileBySlug,
  getProfileDashboardStats,
  listPostsByProfile,
  type ProfileDashboardStats,
  type ProfilePost,
} from "@/services/social-profiles.service";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PostsGrid } from "@/components/social-selling/PostsGrid";

interface PageProps {
  params: { profileSlug: string };
}

function zeroStats(): ProfileDashboardStats {
  return { posts_active: 0, impressions: 0, reach: 0, spend: 0 };
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

  return (
    <div className="space-y-6">
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
