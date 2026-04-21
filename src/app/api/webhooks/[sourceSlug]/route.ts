import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { createAdminClient } from "@/lib/supabase/admin";
import { adaptFluxonPayload, type AdaptedPayload } from "@/lib/integrations/fluxon-adapter";
import { processWebhook } from "@/lib/integrations/webhook-router";
import {
  getSourceBySlug,
  insertEvent,
  markEventProcessed,
  touchSourceLastReceived,
} from "@/services/integrations.service";
import type { IntegrationType } from "@/lib/validators/integration";

interface RouteParams {
  params: { sourceSlug: string };
}

function adaptByType(type: IntegrationType, raw: unknown): AdaptedPayload {
  switch (type) {
    case "fluxon":
      return adaptFluxonPayload(raw);
    default:
      return {
        payload:
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : { payload: raw },
        sourceEventId: null,
        mentoriaId: null,
      };
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = createAdminClient();

  try {
    const headerSecret = request.headers.get("x-webhook-secret");
    if (!headerSecret) {
      return NextResponse.json(
        { error: "Missing x-webhook-secret" },
        { status: 401 }
      );
    }

    const source = await getSourceBySlug(supabase, params.sourceSlug);
    if (!source) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    if (!source.webhook_secret_hash) {
      return NextResponse.json(
        { error: "Source secret not configured" },
        { status: 401 }
      );
    }

    const validSecret = await bcrypt.compare(
      headerSecret,
      source.webhook_secret_hash
    );
    if (!validSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const rawPayload = await request.json().catch(() => null);
    if (rawPayload == null) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const adapted = adaptByType(source.type, rawPayload);

    const inserted = await insertEvent(supabase, {
      source_id: source.id,
      mentoria_id: adapted.mentoriaId,
      payload: adapted.payload,
      source_event_id: adapted.sourceEventId,
    });

    await touchSourceLastReceived(supabase, source.id);

    if (inserted.duplicate) {
      return NextResponse.json(
        { ok: true, eventId: inserted.id, duplicate: true },
        { status: 200 }
      );
    }

    const result = await processWebhook(
      supabase,
      source.mapping,
      adapted.payload,
      {
        source: { type: source.type },
        sourceEventId: adapted.sourceEventId,
        mentoriaId: adapted.mentoriaId,
      }
    );

    await markEventProcessed(
      supabase,
      inserted.id,
      result.ok,
      result.error
    );

    return NextResponse.json(
      {
        ok: result.ok,
        eventId: inserted.id,
        appliedTo: result.appliedTo,
        skipped: result.skipped,
        error: result.error,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/webhooks/[sourceSlug]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
