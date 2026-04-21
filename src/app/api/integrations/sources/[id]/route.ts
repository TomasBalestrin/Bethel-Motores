import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { integrationSourceUpdateSchema } from "@/lib/validators/integration";
import {
  getSourceWithRecentEvents,
  rotateSourceSecret,
  updateMapping,
} from "@/services/integrations.service";

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

    const roleCheck = await assertRole(supabase, user.id, [
      "admin",
      "gestor_infra",
    ]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const data = await getSourceWithRecentEvents(supabase, params.id);
    if (!data) {
      return NextResponse.json(
        { error: "Fonte não encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/integrations/sources/[id]]", error);
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
      "gestor_infra",
    ]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    if (body.rotate_secret === true) {
      const result = await rotateSourceSecret(supabase, params.id);
      return NextResponse.json({ data: result });
    }

    const parsed = integrationSourceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    const data = await updateMapping(supabase, params.id, parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PATCH /api/integrations/sources/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
