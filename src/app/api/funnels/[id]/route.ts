import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { getFunnelById, updateFunnel } from "@/services/funnels.service";

interface RouteParams {
  params: { id: string };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

const funnelPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  list_url: z
    .union([z.string().trim().url().max(2048), z.literal(""), z.null()])
    .optional(),
  template_id: z.string().uuid().optional(),
  is_traffic_funnel: z.boolean().optional(),
  is_active: z.boolean().optional(),
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

    const data = await getFunnelById(supabase, params.id);
    if (!data) {
      return NextResponse.json({ error: "Funil não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/funnels/[id]]", error);
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
      "gestor_infra",
    ]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const parsed = funnelPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const patch: Parameters<typeof updateFunnel>[2] = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.list_url !== undefined) {
      patch.list_url =
        parsed.data.list_url == null || parsed.data.list_url === ""
          ? null
          : parsed.data.list_url;
    }
    if (parsed.data.template_id !== undefined)
      patch.template_id = parsed.data.template_id;
    if (parsed.data.is_traffic_funnel !== undefined)
      patch.is_traffic_funnel = parsed.data.is_traffic_funnel;
    if (parsed.data.is_active !== undefined)
      patch.is_active = parsed.data.is_active;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    const data = await updateFunnel(supabase, params.id, patch);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PATCH /api/funnels/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
