import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { trafegoPlatformSchema } from "@/lib/validators/mentoria";
import { insertTrafegoBatch } from "@/services/mentorias.service";

interface RouteParams {
  params: { id: string };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

const batchEntrySchema = z.object({
  value: z.number().positive(),
  platform: trafegoPlatformSchema,
  captured_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)"),
});

const batchSchema = z.object({
  entries: z.array(batchEntrySchema).min(1).max(500),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    ]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const inserted = await insertTrafegoBatch(
      supabase,
      params.id,
      parsed.data.entries.map((e) => ({
        value: e.value,
        platform: e.platform,
        capturedAt: `${e.captured_at}T12:00:00.000Z`,
      })),
      { actorId: user.id }
    );

    return NextResponse.json({ data: { inserted } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/mentorias/[id]/trafego/bulk]", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
