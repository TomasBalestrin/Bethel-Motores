import type { SupabaseClient } from "@supabase/supabase-js";

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

export interface ProfilePost {
  id: string;
  social_profile_id: string;
  code: string;
  link: string | null;
  post_type: string | null;
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
  captured_at: string;
}

export type PostMetricsHistoryEntry = PostMetrics;

export interface ProfileDashboardStats {
  posts_active: number;
  impressions: number;
  reach: number;
  spend: number;
}

interface PostRow {
  id: string;
  social_profile_id: string;
  code: string;
  link: string | null;
  post_type: string | null;
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
          captured_at: latest.captured_at,
        }
      : null,
  };
}

export async function getProfileBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<SocialProfileSummary | null> {
  const { data, error } = await supabase
    .from("social_profiles")
    .select(SOCIAL_PROFILE_COLUMNS)
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle<SocialProfileSummary>();

  if (error) throw error;
  return data;
}

export async function listPostsByProfile(
  supabase: SupabaseClient,
  profileId: string
): Promise<ProfilePost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
        id,
        social_profile_id,
        code,
        link,
        post_type,
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
          captured_at
        )
      `
    )
    .eq("social_profile_id", profileId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<PostRow[]>();

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
      "impressions, reach, likes, comments, shares, saves, clicks, spend, captured_at"
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
    captured_at: row.captured_at,
  }));
}

export async function getProfileDashboardStats(
  supabase: SupabaseClient,
  profileId: string
): Promise<ProfileDashboardStats> {
  const posts = await listPostsByProfile(supabase, profileId).catch(
    () => [] as ProfilePost[]
  );

  const active = posts.filter((post) => post.is_active);

  let impressions = 0;
  let reach = 0;
  let spend = 0;
  for (const post of active) {
    if (!post.latest_metrics) continue;
    impressions += post.latest_metrics.impressions;
    reach += post.latest_metrics.reach;
    spend += post.latest_metrics.spend;
  }

  return {
    posts_active: active.length,
    impressions,
    reach,
    spend,
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
