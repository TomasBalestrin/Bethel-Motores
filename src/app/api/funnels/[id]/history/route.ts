import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { listFieldHistory } from "@/services/funnels.service";

interface RouteParams {
  params: { id: string };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { searchParams } = new URL(request.url);
    const fieldKey = searchParams.get("field");
    if (!fieldKey || fieldKey.trim().length === 0) {
      return NextResponse.json(
        { error: "Parâmetro 'field' obrigatório" },
        { status: 400 }
      );
    }

    const limitParam = Number(searchParams.get("limit") ?? "100");
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 500
        ? Math.floor(limitParam)
        : 100;

    const data = await listFieldHistory(supabase, params.id, fieldKey, limit);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/funnels/[id]/history]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
