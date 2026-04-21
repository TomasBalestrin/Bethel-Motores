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
