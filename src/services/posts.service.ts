import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PostAnalysisInput,
  PostCreateInput,
  PostMetricsInput,
  PostPatchInput,
} from "@/lib/validators/post";
import type { Post } from "@/types/post";

const POST_COLUMNS =
  "id, social_profile_id, code, link, post_type, budget, is_fit, is_test, is_active, created_by, created_at, updated_at" as const;

export async function listByProfile(
  supabase: SupabaseClient,
  profileId: string
): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("social_profile_id", profileId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<Post[]>();

  if (error) throw error;
  return data ?? [];
}

export interface CreatePostOptions {
  actorId?: string;
}

export async function createPost(
  supabase: SupabaseClient,
  profileId: string,
  input: PostCreateInput,
  options: CreatePostOptions = {}
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      social_profile_id: profileId,
      code: input.code,
      link: input.link,
      budget: input.budget ?? null,
      created_by: options.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}

export async function updatePost(
  supabase: SupabaseClient,
  postId: string,
  patch: PostPatchInput
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("posts")
    .update(patch)
    .eq("id", postId)
    .is("deleted_at", null)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}

export async function insertMetric(
  supabase: SupabaseClient,
  postId: string,
  input: PostMetricsInput,
  options: { actorId?: string } = {}
): Promise<{ id: string }> {
  const spend = Number(input.investment) || 0;
  const { data, error } = await supabase
    .from("post_metrics")
    .insert({
      post_id: postId,
      investment: spend,
      spend,
      followers_gained: input.followers_gained,
      likes: input.likes,
      comments: input.comments,
      shares: input.shares,
      saves: input.saves,
      reach: input.reach,
      impressions: input.impressions,
      clicks: input.clicks,
      captured_at: new Date().toISOString(),
      captured_by: options.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}

const UNSAFE_PATTERNS = [/<script/i, /javascript:/i, /on\w+\s*=/i];

function isSafeText(value: string): boolean {
  return !UNSAFE_PATTERNS.some((pattern) => pattern.test(value));
}

export async function insertAnalysis(
  supabase: SupabaseClient,
  postId: string,
  input: PostAnalysisInput,
  options: { actorId?: string } = {}
): Promise<{ id: string }> {
  const base = {
    post_id: postId,
    created_by: options.actorId ?? null,
  };

  let row: Record<string, unknown>;
  if (input.source === "file") {
    row = {
      ...base,
      source: "file",
      file_url: input.file_url,
      file_name: input.file_name,
    };
  } else if (input.source === "link") {
    if (!/^https?:\/\//i.test(input.link)) {
      throw new Error("URL precisa começar com http:// ou https://");
    }
    row = {
      ...base,
      source: "link",
      link: input.link,
      note: input.note ?? null,
    };
  } else {
    if (!isSafeText(input.content_text)) {
      throw new Error("Conteúdo contém padrões não permitidos");
    }
    row = {
      ...base,
      source: "text",
      content_text: input.content_text,
    };
  }

  const { data, error } = await supabase
    .from("post_analyses")
    .insert(row)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}
