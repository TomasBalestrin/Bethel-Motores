import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

export interface SocialProfileSummary {
  id: string;
  slug: string;
  name: string;
  instagram_handle: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

const SOCIAL_PROFILE_COLUMNS =
  "id, slug, name, instagram_handle, avatar_url, is_active" as const;

export async function listSocialProfiles(
  supabase: SupabaseClient,
  options: { onlyActive?: boolean } = {}
): Promise<SocialProfileSummary[]> {
  let query = supabase
    .from("social_profiles")
    .select(SOCIAL_PROFILE_COLUMNS)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (options.onlyActive ?? true) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<SocialProfileSummary[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getSocialProfile(
  supabase: SupabaseClient,
  id: string
): Promise<SocialProfileSummary | null> {
  const { data, error } = await supabase
    .from("social_profiles")
    .select(SOCIAL_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle<SocialProfileSummary>();

  if (error) throw error;
  return data;
}

export interface SocialProfileWithStats extends SocialProfileSummary {
  active_posts: number;
  followers: number | null;
}

interface ProfileWithCountsRow extends SocialProfileSummary {
  posts: { count: number }[] | null;
  latest_metric: { followers: number | null }[] | null;
}

export async function listProfilesWithStats(
  supabase: SupabaseClient
): Promise<SocialProfileWithStats[]> {
  const { data, error } = await supabase
    .from("social_profiles")
    .select(
      `
        id,
        slug,
        name,
        instagram_handle,
        avatar_url,
        is_active,
        posts(count),
        latest_metric:social_profile_metrics(followers)
      `
    )
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .returns<ProfileWithCountsRow[]>();

  if (error) {
    const fallback = await listSocialProfiles(supabase);
    return fallback.map((profile) => ({
      ...profile,
      active_posts: 0,
      followers: null,
    }));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    instagram_handle: row.instagram_handle,
    avatar_url: row.avatar_url,
    is_active: row.is_active,
    active_posts: row.posts?.[0]?.count ?? 0,
    followers: row.latest_metric?.[0]?.followers ?? null,
  }));
}

export type ProfilePostType = "impulsionar" | "organico";

export interface ProfilePost {
  id: string;
  social_profile_id: string;
  code: string;
  link: string | null;
  post_type: ProfilePostType;
  headline: string | null;
  gancho: string | null;
  assunto: string | null;
  posted_at: string | null;
  is_active: boolean;
  is_fit: boolean;
  is_test: boolean;
  created_at: string;
  latest_metrics: PostMetrics | null;
}

export interface PostMetrics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  spend: number;
  investment: number;
  followers_gained: number;
  hook_rate_3s: number | null;
  hold_50: number | null;
  hold_75: number | null;
  duration_seconds: number | null;
  captured_at: string;
}

export type PostMetricsHistoryEntry = PostMetrics;

export interface ProfileDashboardStatsByType {
  impulsionar: {
    posts_active: number;
    investimento: number;
    seguidores: number;
    hook_rate_avg: number | null;
  };
  organico: {
    posts_active: number;
    reach: number;
    likes: number;
    comments: number;
  };
}

interface PostRow {
  id: string;
  social_profile_id: string;
  code: string;
  link: string | null;
  post_type: ProfilePostType;
  headline: string | null;
  gancho: string | null;
  assunto: string | null;
  posted_at: string | null;
  is_active: boolean;
  is_fit: boolean;
  is_test: boolean;
  created_at: string;
  metrics:
    | {
        impressions: number | null;
        reach: number | null;
        likes: number | null;
        comments: number | null;
        shares: number | null;
        saves: number | null;
        clicks: number | null;
        spend: number | null;
        investment: number | null;
        followers_gained: number | null;
        hook_rate_3s: number | null;
        hold_50: number | null;
        hold_75: number | null;
        duration_seconds: number | null;
        captured_at: string;
      }[]
    | null;
}

function mapPostRow(row: PostRow): ProfilePost {
  const snapshots = row.metrics ?? [];
  const latest =
    snapshots.length > 0
      ? [...snapshots].sort(
          (a, b) =>
            new Date(b.captured_at).getTime() -
            new Date(a.captured_at).getTime()
        )[0] ?? null
      : null;

  return {
    id: row.id,
    social_profile_id: row.social_profile_id,
    code: row.code,
    link: row.link,
    post_type: row.post_type,
    headline: row.headline,
    gancho: row.gancho,
    assunto: row.assunto,
    posted_at: row.posted_at,
    is_active: row.is_active,
    is_fit: row.is_fit,
    is_test: row.is_test,
    created_at: row.created_at,
    latest_metrics: latest
      ? {
          impressions: Number(latest.impressions ?? 0),
          reach: Number(latest.reach ?? 0),
          likes: Number(latest.likes ?? 0),
          comments: Number(latest.comments ?? 0),
          shares: Number(latest.shares ?? 0),
          saves: Number(latest.saves ?? 0),
          clicks: Number(latest.clicks ?? 0),
          spend: Number(latest.spend ?? 0),
          investment: Number(latest.investment ?? 0),
          followers_gained: Number(latest.followers_gained ?? 0),
          hook_rate_3s:
            latest.hook_rate_3s !== null ? Number(latest.hook_rate_3s) : null,
          hold_50: latest.hold_50 !== null ? Number(latest.hold_50) : null,
          hold_75: latest.hold_75 !== null ? Number(latest.hold_75) : null,
          duration_seconds:
            latest.duration_seconds !== null
              ? Number(latest.duration_seconds)
              : null,
          captured_at: latest.captured_at,
        }
      : null,
  };
}

export const getProfileBySlug = cache(
  async (
    supabase: SupabaseClient,
    slug: string
  ): Promise<SocialProfileSummary | null> => {
    const { data, error } = await supabase
      .from("social_profiles")
      .select(SOCIAL_PROFILE_COLUMNS)
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle<SocialProfileSummary>();

    if (error) throw error;
    return data;
  }
);

export async function listPostsByProfile(
  supabase: SupabaseClient,
  profileId: string,
  options: { type?: ProfilePostType } = {}
): Promise<ProfilePost[]> {
  let query = supabase
    .from("posts")
    .select(
      `
        id,
        social_profile_id,
        code,
        link,
        post_type,
        headline,
        gancho,
        assunto,
        posted_at,
        is_active,
        is_fit,
        is_test,
        created_at,
        metrics:post_metrics(
          impressions,
          reach,
          likes,
          comments,
          shares,
          saves,
          clicks,
          spend,
          investment,
          followers_gained,
          hook_rate_3s,
          hold_50,
          hold_75,
          duration_seconds,
          captured_at
        )
      `
    )
    .eq("social_profile_id", profileId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (options.type) {
    query = query.eq("post_type", options.type);
  }

  const { data, error } = await query.returns<PostRow[]>();

  if (error) throw error;
  return (data ?? []).map(mapPostRow);
}

export async function listPostMetricsHistory(
  supabase: SupabaseClient,
  postId: string,
  limit = 30
): Promise<PostMetricsHistoryEntry[]> {
  const { data, error } = await supabase
    .from("post_metrics")
    .select(
      "impressions, reach, likes, comments, shares, saves, clicks, spend, investment, followers_gained, hook_rate_3s, hold_50, hold_75, duration_seconds, captured_at"
    )
    .eq("post_id", postId)
    .order("captured_at", { ascending: true })
    .limit(limit)
    .returns<
      {
        impressions: number | null;
        reach: number | null;
        likes: number | null;
        comments: number | null;
        shares: number | null;
        saves: number | null;
        clicks: number | null;
        spend: number | null;
        investment: number | null;
        followers_gained: number | null;
        hook_rate_3s: number | null;
        hold_50: number | null;
        hold_75: number | null;
        duration_seconds: number | null;
        captured_at: string;
      }[]
    >();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    impressions: Number(row.impressions ?? 0),
    reach: Number(row.reach ?? 0),
    likes: Number(row.likes ?? 0),
    comments: Number(row.comments ?? 0),
    shares: Number(row.shares ?? 0),
    saves: Number(row.saves ?? 0),
    clicks: Number(row.clicks ?? 0),
    spend: Number(row.spend ?? 0),
    investment: Number(row.investment ?? 0),
    followers_gained: Number(row.followers_gained ?? 0),
    hook_rate_3s:
      row.hook_rate_3s !== null ? Number(row.hook_rate_3s) : null,
    hold_50: row.hold_50 !== null ? Number(row.hold_50) : null,
    hold_75: row.hold_75 !== null ? Number(row.hold_75) : null,
    duration_seconds:
      row.duration_seconds !== null ? Number(row.duration_seconds) : null,
    captured_at: row.captured_at,
  }));
}

export async function getProfileDashboardStats(
  supabase: SupabaseClient,
  profileId: string
): Promise<ProfileDashboardStatsByType> {
  const posts = await listPostsByProfile(supabase, profileId);

  const activeImpulsionar = posts.filter(
    (p) => p.is_active && p.post_type === "impulsionar"
  );
  const activeOrganico = posts.filter(
    (p) => p.is_active && p.post_type === "organico"
  );

  let investimento = 0;
  let seguidores = 0;
  let hookRateSum = 0;
  let hookRateCount = 0;
  for (const post of activeImpulsionar) {
    const m = post.latest_metrics;
    if (!m) continue;
    investimento += m.investment ?? m.spend ?? 0;
    seguidores += m.followers_gained ?? 0;
    if (m.hook_rate_3s !== null) {
      hookRateSum += m.hook_rate_3s;
      hookRateCount += 1;
    }
  }

  let reach = 0;
  let likes = 0;
  let comments = 0;
  for (const post of activeOrganico) {
    const m = post.latest_metrics;
    if (!m) continue;
    reach += m.reach ?? 0;
    likes += m.likes ?? 0;
    comments += m.comments ?? 0;
  }

  return {
    impulsionar: {
      posts_active: activeImpulsionar.length,
      investimento,
      seguidores,
      hook_rate_avg: hookRateCount > 0 ? hookRateSum / hookRateCount : null,
    },
    organico: {
      posts_active: activeOrganico.length,
      reach,
      likes,
      comments,
    },
  };
}

export interface CreateSocialProfileInput {
  motor_id: string;
  slug: string;
  name: string;
  instagram_handle?: string | null;
  avatar_url?: string | null;
}

export async function createSocialProfile(
  supabase: SupabaseClient,
  input: CreateSocialProfileInput,
  options: { actorId?: string | null } = {}
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("social_profiles")
    .insert({
      motor_id: input.motor_id,
      slug: input.slug,
      name: input.name,
      instagram_handle: input.instagram_handle ?? null,
      avatar_url: input.avatar_url ?? null,
      is_active: true,
      created_by: options.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}
