import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { mentoriaUpdateSchema } from "@/lib/validators/mentoria";
import {
  getMentoriaById,
  updateMentoria,
} from "@/services/mentorias.service";

interface RouteParams {
  params: { id: string };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

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

    const data = await getMentoriaById(supabase, params.id);
    if (!data) {
      return NextResponse.json({ error: "Mentoria não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/mentorias/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const parsed = mentoriaUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const patch: Parameters<typeof updateMentoria>[2] = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.scheduled_at !== undefined)
      patch.scheduled_at = new Date(parsed.data.scheduled_at).toISOString();
    if (parsed.data.specialist_id !== undefined)
      patch.specialist_id = parsed.data.specialist_id;
    if (parsed.data.traffic_budget !== undefined)
      patch.traffic_budget = parsed.data.traffic_budget ?? null;
    if (parsed.data.status !== undefined) patch.status = parsed.data.status;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    const data = await updateMentoria(supabase, params.id, patch);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PATCH /api/mentorias/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
