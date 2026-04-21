import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { updateOwnPassword } from "@/services/users.service";

const bodySchema = z.object({
  current_password: z.string().min(8).max(72),
  new_password: z.string().min(8).max(72),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.current_password,
    });
    if (verifyError) {
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 422 }
      );
    }

    await updateOwnPassword(supabase, parsed.data.new_password);
    return NextResponse.json({ data: { id: user.id } });
  } catch (error) {
    console.error("[PATCH /api/users/me/password]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
