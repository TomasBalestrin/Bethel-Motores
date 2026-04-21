import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import {
  createSocialProfile,
  listProfilesWithStats,
} from "@/services/social-profiles.service";

const createSchema = z.object({
  motor_id: z.string().uuid(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Use a-z, 0-9 e -"),
  name: z.string().trim().min(2).max(120),
  instagram_handle: z.string().trim().max(60).optional().nullable(),
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

    const data = await listProfilesWithStats(supabase);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/social-profiles]", error);
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

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const avatarUrl =
      parsed.data.avatar_url === "" ? null : parsed.data.avatar_url ?? null;

    const data = await createSocialProfile(
      supabase,
      {
        motor_id: parsed.data.motor_id,
        slug: parsed.data.slug,
        name: parsed.data.name,
        instagram_handle: parsed.data.instagram_handle ?? null,
        avatar_url: avatarUrl,
      },
      { actorId: user.id }
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/social-profiles]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
