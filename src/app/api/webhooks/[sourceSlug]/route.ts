import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { createAdminClient } from "@/lib/supabase/admin";
import { adaptFluxonPayload, type AdaptedPayload } from "@/lib/integrations/fluxon-adapter";
import {
  buildDisparoChildPayload,
  extractFluxonTemplates,
} from "@/lib/integrations/fluxon-templates-fanout";
import { processWebhook } from "@/lib/integrations/webhook-router";
import {
  getSourceBySlug,
  insertEvent,
  markEventProcessed,
  touchSourceLastReceived,
} from "@/services/integrations.service";
import type { IntegrationType } from "@/lib/validators/integration";
import type { SupabaseClient } from "@supabase/supabase-js";

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

    // Fan-out: se for fluxon e o payload tiver `data.templates[]`, cria 1 evento filho
    // por template no formato disparo (volume_sent/cost/etc.). Sem isso, a tela de
    // Disparos só mostraria o primeiro template do array (BFS do toDisparoDTO encontra
    // só a primeira ocorrência de cada chave) e o custo viria 0 (cost_brl não é alias
    // de `cost` no pickNumberFromIndex). Falhas dos filhos NÃO derrubam a request:
    // o evento agregado já foi processado e a `mentoria_metrics` já foi atualizada.
    let childrenCreated = 0;
    if (source.type === "fluxon" && adapted.sourceEventId) {
      childrenCreated = await fanoutFluxonTemplates(supabase, {
        sourceId: source.id,
        mentoriaId: adapted.mentoriaId,
        parentSourceEventId: adapted.sourceEventId,
        payload: adapted.payload,
      });
    }

    return NextResponse.json(
      {
        ok: result.ok,
        eventId: inserted.id,
        appliedTo: result.appliedTo,
        skipped: result.skipped,
        error: result.error,
        ...(childrenCreated > 0 && { templateChildrenCreated: childrenCreated }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/webhooks/[sourceSlug]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

interface FanoutInput {
  sourceId: string;
  mentoriaId: string | null;
  parentSourceEventId: string;
  payload: Record<string, unknown>;
}

async function fanoutFluxonTemplates(
  supabase: SupabaseClient,
  input: FanoutInput
): Promise<number> {
  const templates = extractFluxonTemplates(input.payload);
  if (templates.length === 0) return 0;

  let created = 0;
  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    if (!template) continue;
    const child = buildDisparoChildPayload({
      parentSourceEventId: input.parentSourceEventId,
      index: i,
      template,
    });

    try {
      const inserted = await insertEvent(supabase, {
        source_id: input.sourceId,
        mentoria_id: input.mentoriaId,
        payload: child.payload,
        source_event_id: child.sourceEventId,
      });

      if (!inserted.duplicate) {
        await markEventProcessed(supabase, inserted.id, true);
        created++;
      }
    } catch (err) {
      console.error(
        "[POST /api/webhooks/[sourceSlug]] fanout filho falhou",
        { parentSourceEventId: input.parentSourceEventId, index: i, template: template.name },
        err instanceof Error ? err.message : err
      );
      // Continua os próximos filhos. Falha de um não bloqueia os outros.
    }
  }
  return created;
}
