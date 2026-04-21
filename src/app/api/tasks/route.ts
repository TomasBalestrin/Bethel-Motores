import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { taskCreateSchema } from "@/lib/validators/task";
import { createTask, listTasksByProfile } from "@/services/tasks.service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profile_id");
    if (!profileId) {
      return NextResponse.json(
        { error: "Parâmetro profile_id obrigatório" },
        { status: 400 }
      );
    }
    const data = await listTasksByProfile(supabase, profileId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/tasks]", error);
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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const parsed = taskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = await createTask(supabase, parsed.data, { actorId: user.id });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
