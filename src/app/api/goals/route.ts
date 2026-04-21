import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { goalCreateSchema, goalUpdateSchema } from "@/lib/validators/goal";
import {
  createGoal,
  listGoals,
  softDeleteGoal,
  updateGoal,
} from "@/services/goals.service";

const goalPatchSchema = z.object({
  id: z.string().uuid(),
  patch: goalUpdateSchema,
});

const goalDeleteSchema = z.object({
  id: z.string().uuid(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const data = await listGoals(supabase);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/goals]", error);
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

    const roleCheck = await assertRole(supabase, user.id, ["admin"]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const parsed = goalCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = await createGoal(supabase, parsed.data, { actorId: user.id });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/goals]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const roleCheck = await assertRole(supabase, user.id, ["admin"]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const parsed = goalPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = await updateGoal(supabase, parsed.data.id, parsed.data.patch);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PATCH /api/goals]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const roleCheck = await assertRole(supabase, user.id, ["admin"]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const parsed = goalDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }
    await softDeleteGoal(supabase, parsed.data.id);
    return NextResponse.json({ data: { id: parsed.data.id } });
  } catch (error) {
    console.error("[DELETE /api/goals]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
