import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  MeetingBulkImportInput,
  MeetingCreateInput,
  MeetingImportRow,
  PostAnalysisInput,
  PostCreateInput,
  PostMetricsInput,
  PostPatchInput,
} from "@/lib/validators/post";
import type { Post, PostMeeting } from "@/types/post";

const POST_COLUMNS =
  "id, social_profile_id, code, link, is_fit, is_test, is_active, created_by, created_at, updated_at" as const;

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
  // Unique constraint é parcial (só posts não-deletados), então o insert
  // funciona mesmo se houver um post soft-deletado com mesmo link.
  const { data, error } = await supabase
    .from("posts")
    .insert({
      social_profile_id: profileId,
      code: input.code,
      link: input.link,
      created_by: options.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um post ativo com esse link neste perfil");
    }
    throw error;
  }
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

export async function createMeeting(
  supabase: SupabaseClient,
  postId: string,
  input: MeetingCreateInput,
  options: { actorId?: string } = {}
): Promise<{ id: string }> {
  const spend = Number(input.metrics.investment) || 0;
  const { data: metric, error: metricError } = await supabase
    .from("post_metrics")
    .insert({
      post_id: postId,
      investment: spend,
      spend,
      followers_gained: input.metrics.followers_gained,
      likes: input.metrics.likes,
      comments: input.metrics.comments,
      shares: input.metrics.shares,
      saves: input.metrics.saves,
      reach: input.metrics.reach,
      impressions: input.metrics.impressions,
      clicks: input.metrics.clicks,
      captured_at: new Date().toISOString(),
      captured_by: options.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (metricError) throw metricError;

  const { data: meeting, error: meetingError } = await supabase
    .from("post_meetings")
    .insert({
      post_id: postId,
      meeting_type: input.meeting_type,
      meeting_date: input.meeting_date,
      metrics_id: metric.id,
      created_by: options.actorId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (meetingError) throw meetingError;

  if (input.pause_post) {
    const { error: pauseError } = await supabase
      .from("posts")
      .update({ is_active: false })
      .eq("id", postId);
    if (pauseError) throw pauseError;
  }

  return meeting;
}

interface MeetingRow {
  id: string;
  post_id: string;
  meeting_type: "terca" | "sexta";
  meeting_date: string;
  metrics_id: string | null;
  created_by: string | null;
  created_at: string;
  metrics: {
    impressions: number | null;
    reach: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    clicks: number | null;
    spend: number | null;
  } | null;
}

export async function listMeetings(
  supabase: SupabaseClient,
  postId: string
): Promise<PostMeeting[]> {
  const { data, error } = await supabase
    .from("post_meetings")
    .select(
      `
        id,
        post_id,
        meeting_type,
        meeting_date,
        metrics_id,
        created_by,
        created_at,
        metrics:post_metrics!post_meetings_metrics_id_fkey(
          impressions, reach, likes, comments, shares, saves, clicks, spend
        )
      `
    )
    .eq("post_id", postId)
    .order("meeting_date", { ascending: false })
    .returns<MeetingRow[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    post_id: row.post_id,
    meeting_type: row.meeting_type,
    meeting_date: row.meeting_date,
    metrics_id: row.metrics_id,
    created_by: row.created_by,
    created_at: row.created_at,
    metrics: row.metrics
      ? {
          impressions: Number(row.metrics.impressions ?? 0),
          reach: Number(row.metrics.reach ?? 0),
          likes: Number(row.metrics.likes ?? 0),
          comments: Number(row.metrics.comments ?? 0),
          shares: Number(row.metrics.shares ?? 0),
          saves: Number(row.metrics.saves ?? 0),
          clicks: Number(row.metrics.clicks ?? 0),
          spend: Number(row.metrics.spend ?? 0),
        }
      : null,
  }));
}

export async function deleteMeeting(
  supabase: SupabaseClient,
  meetingId: string
): Promise<void> {
  const { data: meeting, error: fetchError } = await supabase
    .from("post_meetings")
    .select("id, metrics_id")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; metrics_id: string | null }>();

  if (fetchError) throw fetchError;
  if (!meeting) return;

  const { error: delMeetingError } = await supabase
    .from("post_meetings")
    .delete()
    .eq("id", meetingId);
  if (delMeetingError) throw delMeetingError;

  if (meeting.metrics_id) {
    const { error: delMetricError } = await supabase
      .from("post_metrics")
      .delete()
      .eq("id", meeting.metrics_id);
    if (delMetricError) throw delMetricError;
  }
}

export async function deletePost(
  supabase: SupabaseClient,
  postId: string
): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", postId)
    .is("deleted_at", null);

  if (error) throw error;
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

export interface AnalysisEntry {
  id: string;
  post_id: string;
  source: "file" | "link" | "text";
  file_url: string | null;
  file_name: string | null;
  link: string | null;
  note: string | null;
  content_text: string | null;
  created_by: string | null;
  author_name: string | null;
  created_at: string;
}

interface AnalysisRow {
  id: string;
  post_id: string;
  source: "file" | "link" | "text";
  file_url: string | null;
  file_name: string | null;
  link: string | null;
  note: string | null;
  content_text: string | null;
  created_by: string | null;
  created_at: string;
  author: { name: string | null } | null;
}

export async function listAnalyses(
  supabase: SupabaseClient,
  postId: string
): Promise<AnalysisEntry[]> {
  const { data, error } = await supabase
    .from("post_analyses")
    .select(
      `
        id,
        post_id,
        source,
        file_url,
        file_name,
        link,
        note,
        content_text,
        created_by,
        created_at,
        author:user_profiles!post_analyses_created_by_fkey(name)
      `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .returns<AnalysisRow[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    post_id: row.post_id,
    source: row.source,
    file_url: row.file_url,
    file_name: row.file_name,
    link: row.link,
    note: row.note,
    content_text: row.content_text,
    created_by: row.created_by,
    author_name: row.author?.name ?? null,
    created_at: row.created_at,
  }));
}

export async function createSignedAnalysisUrl(
  supabase: SupabaseClient,
  filePath: string,
  expiresInSeconds = 60 * 5
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("post-analyses")
    .createSignedUrl(filePath, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export interface BulkImportMeetingsResult {
  posts_created: number;
  posts_updated: number;
  meetings_created: number;
  metrics_snapshots_created: number;
  errors: string[];
}

export async function bulkImportMeetings(
  supabase: SupabaseClient,
  profileId: string,
  input: MeetingBulkImportInput,
  options: { actorId?: string } = {}
): Promise<BulkImportMeetingsResult> {
  const rows = input.rows;
  const byLink = new Map<string, MeetingImportRow[]>();
  for (const row of rows) {
    const list = byLink.get(row.link) ?? [];
    list.push(row);
    byLink.set(row.link, list);
  }

  const result: BulkImportMeetingsResult = {
    posts_created: 0,
    posts_updated: 0,
    meetings_created: 0,
    metrics_snapshots_created: 0,
    errors: [],
  };

  for (const [link, rowsForLink] of Array.from(byLink.entries())) {
    try {
      const { data: existing, error: findError } = await supabase
        .from("posts")
        .select("id, is_active, posted_at")
        .eq("social_profile_id", profileId)
        .eq("link", link)
        .is("deleted_at", null)
        .maybeSingle<{ id: string; is_active: boolean; posted_at: string | null }>();

      if (findError) throw findError;

      let postId: string;
      const earliestPostedAt =
        rowsForLink
          .map((r: MeetingImportRow) => r.posted_at)
          .filter((d: string | null): d is string => Boolean(d))
          .sort()[0] ?? null;
      const first = rowsForLink[0];
      const derivedCode = first?.shortcode ?? `POST-${first?.meeting_date ?? "unknown"}`;

      if (!existing) {
        const { data: created, error: createError } = await supabase
          .from("posts")
          .insert({
            social_profile_id: profileId,
            code: derivedCode,
            link,
            posted_at: earliestPostedAt,
            created_by: options.actorId ?? null,
          })
          .select("id")
          .single<{ id: string }>();
        if (createError) throw createError;
        postId = created.id;
        result.posts_created += 1;
      } else {
        postId = existing.id;
        if (earliestPostedAt && !existing.posted_at) {
          await supabase
            .from("posts")
            .update({ posted_at: earliestPostedAt })
            .eq("id", postId);
          result.posts_updated += 1;
        }
      }

      const sortedRows = [...rowsForLink].sort(
        (a: MeetingImportRow, b: MeetingImportRow) =>
          a.meeting_date.localeCompare(b.meeting_date)
      );

      for (const row of sortedRows) {
        let metricsId: string | null = null;
        if (!row.is_placeholder) {
          const spend = row.investment ?? 0;
          const { data: metric, error: metricError } = await supabase
            .from("post_metrics")
            .insert({
              post_id: postId,
              investment: spend,
              spend,
              followers_gained: row.followers_gained ?? 0,
              likes: 0,
              comments: 0,
              shares: 0,
              saves: 0,
              reach: 0,
              impressions: 0,
              clicks: 0,
              hook_rate_3s: row.hook_rate_3s,
              hold_50: row.hold_50,
              hold_75: row.hold_75,
              duration_seconds: row.duration_seconds,
              captured_at: `${row.meeting_date}T12:00:00Z`,
              captured_by: options.actorId ?? null,
            })
            .select("id")
            .single<{ id: string }>();
          if (metricError) throw metricError;
          metricsId = metric.id;
          result.metrics_snapshots_created += 1;
        }

        const { error: meetingError } = await supabase
          .from("post_meetings")
          .insert({
            post_id: postId,
            meeting_type: row.meeting_type,
            meeting_date: row.meeting_date,
            metrics_id: metricsId,
            gancho: row.gancho,
            headline: row.headline,
            assunto: row.assunto,
            created_by: options.actorId ?? null,
          });
        if (meetingError) throw meetingError;
        result.meetings_created += 1;
      }

      // Se a reunião mais recente tiver pause_post, marca como inativo
      const mostRecent = sortedRows[sortedRows.length - 1];
      if (mostRecent?.pause_post) {
        await supabase
          .from("posts")
          .update({ is_active: false })
          .eq("id", postId);
      }
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      result.errors.push(`${link}: ${message}`);
    }
  }

  return result;
}
