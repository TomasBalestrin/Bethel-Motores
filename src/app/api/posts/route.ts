import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { postCreateSchema } from "@/lib/validators/post";
import { createPost, listByProfile } from "@/services/posts.service";

const postCreateWithProfile = postCreateSchema.extend({
  social_profile_id: z.string().uuid(),
});

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
    const data = await listByProfile(supabase, profileId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/posts]", error);
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
      "gestor_trafego",
    ]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const parsed = postCreateWithProfile.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = await createPost(
      supabase,
      parsed.data.social_profile_id,
      {
        code: parsed.data.code,
        link: parsed.data.link,
      },
      { actorId: user.id }
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/posts]", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
