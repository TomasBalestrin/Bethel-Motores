import type { SupabaseClient } from "@supabase/supabase-js";

export interface ReprocessResult {
  id: string;
  status: "pending";
}

export async function reprocessEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<ReprocessResult> {
  const { data, error } = await supabase
    .from("integration_events")
    .update({
      status: "pending",
      error_message: null,
      processed_at: null,
    })
    .eq("id", eventId)
    .select("id, status")
    .single<{ id: string; status: "pending" }>();

  if (error) throw error;
  return data;
}

export async function getEventById(
  supabase: SupabaseClient,
  eventId: string
) {
  const { data, error } = await supabase
    .from("integration_events")
    .select(
      `
        id,
        source_id,
        mentoria_id,
        payload,
        status,
        error_message,
        source_event_id,
        received_at,
        processed_at,
        source:integration_sources!integration_events_source_id_fkey(id, slug, name)
      `
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
