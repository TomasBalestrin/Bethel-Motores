import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { compareByIds } from "@/services/mentorias.service";

const compareSchema = z.object({
  ids: z.array(z.string().uuid()).min(2).max(4),
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
    const rawIds = (searchParams.get("ids") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const parsed = compareSchema.safeParse({ ids: rawIds });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Selecione entre 2 e 4 mentorias válidas",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await compareByIds(supabase, parsed.data.ids);

    return NextResponse.json({
      data: result.mentorias,
      meta: {
        ids: result.ids,
        found: result.found,
        missing: result.missing,
        baseId: result.found[0] ?? null,
      },
    });
  } catch (error) {
    console.error("[GET /api/compare]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
