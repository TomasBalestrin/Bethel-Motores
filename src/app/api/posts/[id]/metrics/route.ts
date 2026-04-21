import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { postMetricsSchema } from "@/lib/validators/post";
import { insertMetric } from "@/services/posts.service";

interface RouteParams {
  params: { id: string };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
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
    const parsed = postMetricsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = await insertMetric(supabase, params.id, parsed.data, {
      actorId: user.id,
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/posts/[id]/metrics]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
