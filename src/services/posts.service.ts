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
  "id, social_profile_id, code, link, post_type, headline, gancho, assunto, posted_at, is_fit, is_test, is_active, created_by, created_at, updated_at" as const;

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
      post_type: input.post_type,
      headline: input.headline ?? null,
      gancho: input.gancho ?? null,
      assunto: input.assunto ?? null,
      posted_at: input.posted_at ?? null,
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
      hook_rate_3s: input.metrics.hook_rate_3s ?? null,
      hold_50: input.metrics.hold_50 ?? null,
      hold_75: input.metrics.hold_75 ?? null,
      duration_seconds: input.metrics.duration_seconds ?? null,
      captured_at: `${input.meeting_date}T12:00:00Z`,
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
    investment: number | null;
    followers_gained: number | null;
    hook_rate_3s: number | null;
    hold_50: number | null;
    hold_75: number | null;
    duration_seconds: number | null;
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
          impressions, reach, likes, comments, shares, saves, clicks, spend,
          investment, followers_gained,
          hook_rate_3s, hold_50, hold_75, duration_seconds
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
          investment: Number(row.metrics.investment ?? 0),
          followers_gained: Number(row.metrics.followers_gained ?? 0),
          hook_rate_3s:
            row.metrics.hook_rate_3s !== null
              ? Number(row.metrics.hook_rate_3s)
              : null,
          hold_50:
            row.metrics.hold_50 !== null ? Number(row.metrics.hold_50) : null,
          hold_75:
            row.metrics.hold_75 !== null ? Number(row.metrics.hold_75) : null,
          duration_seconds:
            row.metrics.duration_seconds !== null
              ? Number(row.metrics.duration_seconds)
              : null,
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

export async function updateMeeting(
  supabase: SupabaseClient,
  meetingId: string,
  input: MeetingCreateInput,
  options: { actorId?: string } = {}
): Promise<{ id: string }> {
  const { data: existing, error: fetchError } = await supabase
    .from("post_meetings")
    .select("id, post_id, metrics_id")
    .eq("id", meetingId)
    .maybeSingle<{
      id: string;
      post_id: string;
      metrics_id: string | null;
    }>();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Reunião não encontrada");

  const spend = Number(input.metrics.investment) || 0;
  const metricsPayload = {
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
    hook_rate_3s: input.metrics.hook_rate_3s ?? null,
    hold_50: input.metrics.hold_50 ?? null,
    hold_75: input.metrics.hold_75 ?? null,
    duration_seconds: input.metrics.duration_seconds ?? null,
  };

  let metricsId = existing.metrics_id;
  if (metricsId) {
    const { error: updateMetricError } = await supabase
      .from("post_metrics")
      .update(metricsPayload)
      .eq("id", metricsId);
    if (updateMetricError) throw updateMetricError;
  } else {
    const { data: newMetric, error: insertMetricError } = await supabase
      .from("post_metrics")
      .insert({
        ...metricsPayload,
        post_id: existing.post_id,
        captured_at: `${input.meeting_date}T12:00:00Z`,
        captured_by: options.actorId ?? null,
      })
      .select("id")
      .single<{ id: string }>();
    if (insertMetricError) throw insertMetricError;
    metricsId = newMetric.id;
  }

  const { error: updateMeetingError } = await supabase
    .from("post_meetings")
    .update({
      meeting_type: input.meeting_type,
      meeting_date: input.meeting_date,
      metrics_id: metricsId,
    })
    .eq("id", meetingId);
  if (updateMeetingError) throw updateMeetingError;

  if (input.pause_post) {
    const { error: pauseError } = await supabase
      .from("posts")
      .update({ is_active: false })
      .eq("id", existing.post_id);
    if (pauseError) throw pauseError;
  }

  return { id: meetingId };
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
        // Todas as linhas de um mesmo link vêm com post_type já detectado;
        // use o da primeira linha. Também aproveita headline/gancho/assunto
        // da linha mais recente preenchida.
        const postType = first?.post_type ?? "impulsionar";
        const headlineSource = [...rowsForLink]
          .reverse()
          .find((r) => r.headline);
        const ganchoSource = [...rowsForLink].reverse().find((r) => r.gancho);
        const assuntoSource = [...rowsForLink]
          .reverse()
          .find((r) => r.assunto);

        const { data: created, error: createError } = await supabase
          .from("posts")
          .insert({
            social_profile_id: profileId,
            code: derivedCode,
            link,
            post_type: postType,
            headline: headlineSource?.headline ?? null,
            gancho: ganchoSource?.gancho ?? null,
            assunto: assuntoSource?.assunto ?? null,
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
        const patch: Record<string, unknown> = {};
        if (earliestPostedAt && !existing.posted_at) {
          patch.posted_at = earliestPostedAt;
        }
        const headlineSource = [...rowsForLink]
          .reverse()
          .find((r) => r.headline);
        const ganchoSource = [...rowsForLink].reverse().find((r) => r.gancho);
        const assuntoSource = [...rowsForLink]
          .reverse()
          .find((r) => r.assunto);
        if (headlineSource?.headline) patch.headline = headlineSource.headline;
        if (ganchoSource?.gancho) patch.gancho = ganchoSource.gancho;
        if (assuntoSource?.assunto) patch.assunto = assuntoSource.assunto;

        if (Object.keys(patch).length > 0) {
          await supabase.from("posts").update(patch).eq("id", postId);
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
              likes: row.likes ?? 0,
              comments: row.comments ?? 0,
              shares: row.shares ?? 0,
              saves: 0,
              reach: row.reach ?? 0,
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
