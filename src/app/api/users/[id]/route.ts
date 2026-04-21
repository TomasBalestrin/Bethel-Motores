import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  deactivateUser,
  reactivateUser,
  updateUserRole,
} from "@/services/users.service";

interface RouteParams {
  params: { id: string };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

const userPatchSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  is_active: z.boolean().optional(),
});

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

    const roleCheck = await assertRole(supabase, user.id, ["admin"]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const parsed = userPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    if (parsed.data.role) {
      const data = await updateUserRole(supabase, params.id, parsed.data.role);
      return NextResponse.json({ data });
    }

    if (parsed.data.is_active === false) {
      if (params.id === user.id) {
        return NextResponse.json(
          { error: "Não é possível desativar o próprio usuário" },
          { status: 422 }
        );
      }
      const data = await deactivateUser(supabase, params.id);
      return NextResponse.json({ data });
    }

    if (parsed.data.is_active === true) {
      const data = await reactivateUser(supabase, params.id);
      return NextResponse.json({ data });
    }

    return NextResponse.json(
      { error: "Nenhum campo para atualizar" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[PATCH /api/users/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
