import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { trafegoPlatformSchema } from "@/lib/validators/mentoria";
import {
  insertTrafegoEntry,
  listTrafegoByMentoria,
} from "@/services/mentorias.service";

interface RouteParams {
  params: { id: string };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

const trafegoInputSchema = z.object({
  value: z.number().positive("Valor deve ser positivo"),
  platform: trafegoPlatformSchema,
  captured_at: z.string().datetime().optional(),
  funnel_id: z.string().uuid().nullable().optional(),
});

export async function GET(_request: NextRequest, { params }: RouteParams) {
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
    const data = await listTrafegoByMentoria(supabase, params.id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/mentorias/[id]/trafego]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
      "gestor_trafego",
    ]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const parsed = trafegoInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = await insertTrafegoEntry(supabase, params.id, {
      value: parsed.data.value,
      platform: parsed.data.platform,
      capturedAt: parsed.data.captured_at,
      actorId: user.id,
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/mentorias/[id]/trafego]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
