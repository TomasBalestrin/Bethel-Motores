import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRole } from "@/lib/auth/guard";
import {
  markEventProcessed,
  reprocessEvent,
} from "@/services/integrations.service";
import { processWebhook } from "@/lib/integrations/webhook-router";
import { adaptFluxonPayload } from "@/lib/integrations/fluxon-adapter";
import type { IntegrationType } from "@/lib/validators/integration";

interface RouteParams {
  params: { id: string };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

interface EventRow {
  id: string;
  source_id: string;
  payload: Record<string, unknown>;
  source_event_id: string | null;
  mentoria_id: string | null;
  source: {
    id: string;
    slug: string;
    type: IntegrationType;
    mapping: Record<string, unknown> | null;
    is_active: boolean;
  } | null;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    if (!isUuid(params.id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const roleCheck = await assertRole(supabase, user.id, [
      "admin",
      "gestor_infra",
    ]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const admin = createAdminClient();
    await reprocessEvent(admin, params.id);

    const { data: event, error: eventError } = await admin
      .from("integration_events")
      .select(
        `
          id,
          source_id,
          payload,
          source_event_id,
          mentoria_id,
          source:integration_sources!integration_events_source_id_fkey(
            id, slug, type, mapping, is_active
          )
        `
      )
      .eq("id", params.id)
      .maybeSingle<EventRow>();

    if (eventError || !event || !event.source) {
      await markEventProcessed(
        admin,
        params.id,
        false,
        "Evento ou fonte não encontrada"
      );
      return NextResponse.json(
        { error: "Evento ou fonte não encontrada" },
        { status: 404 }
      );
    }

    if (!event.source.is_active) {
      await markEventProcessed(admin, params.id, false, "Fonte inativa");
      return NextResponse.json(
        { error: "Fonte inativa — ative para reprocessar" },
        { status: 422 }
      );
    }

    const adapted =
      event.source.type === "fluxon"
        ? adaptFluxonPayload(event.payload)
        : {
            payload: event.payload,
            sourceEventId: event.source_event_id,
            mentoriaId: event.mentoria_id,
          };

    const result = await processWebhook(
      admin,
      event.source.mapping ?? {},
      adapted.payload,
      {
        source: { type: event.source.type },
        sourceEventId: adapted.sourceEventId ?? event.source_event_id,
        mentoriaId: adapted.mentoriaId ?? event.mentoria_id,
      }
    );

    await markEventProcessed(admin, params.id, result.ok, result.error);

    return NextResponse.json({
      data: {
        id: params.id,
        ok: result.ok,
        appliedTo: result.appliedTo,
        skipped: result.skipped,
        error: result.error,
      },
    });
  } catch (error) {
    console.error("[POST /api/integrations/events/[id]/reprocess]", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
