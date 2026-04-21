import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  getUserProfile,
  updateOwnProfile,
} from "@/services/users.service";

const meSchema = z.object({
  name: z.string().trim().min(1).max(120).nullable().optional(),
  avatar_url: z
    .union([z.string().trim().url().max(2048), z.literal(""), z.null()])
    .optional(),
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
    const data = await getUserProfile(supabase, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/users/me]", error);
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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const parsed = meSchema.safeParse(body);
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

    const data = await updateOwnProfile(supabase, user.id, {
      name: parsed.data.name ?? undefined,
      avatar_url:
        parsed.data.avatar_url === "" ? null : parsed.data.avatar_url,
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PATCH /api/users/me]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
