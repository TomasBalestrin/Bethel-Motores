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
