import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { integrationSourceCreateSchema } from "@/lib/validators/integration";
import {
  createSource,
  listSources,
} from "@/services/integrations.service";

export async function GET() {
  try {
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

    const data = await listSources(supabase);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/integrations/sources]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const parsed = integrationSourceCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await createSource(
      supabase,
      {
        slug: parsed.data.slug,
        name: parsed.data.name,
        type: parsed.data.type,
        mapping: parsed.data.mapping,
        config: parsed.data.config,
      },
      { actorId: user.id }
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/integrations/sources]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
