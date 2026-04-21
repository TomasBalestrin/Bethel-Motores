import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { taskCommentSchema, taskPatchSchema } from "@/lib/validators/task";
import {
  addComment,
  getTaskWithComments,
  updateTask,
} from "@/services/tasks.service";

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

    const data = await getTaskWithComments(supabase, params.id);
    if (!data) {
      return NextResponse.json({ error: "Task não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/tasks/[id]]", error);
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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    if (typeof body.comment === "string") {
      const parsed = taskCommentSchema.safeParse({ content: body.comment });
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.format() },
          { status: 400 }
        );
      }
      const data = await addComment(supabase, params.id, parsed.data, {
        actorId: user.id,
      });
      return NextResponse.json({ data }, { status: 201 });
    }

    const parsed = taskPatchSchema.safeParse(body);
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
    const data = await updateTask(supabase, params.id, parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PATCH /api/tasks/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
