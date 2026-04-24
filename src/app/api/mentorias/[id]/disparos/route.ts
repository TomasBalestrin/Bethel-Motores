import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRole } from "@/lib/auth/guard";
import { disparoManualSchema } from "@/lib/validators/mentoria";
import { createManualDisparo } from "@/services/mentorias.service";

interface RouteParams {
  params: { id: string };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

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
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const parsed = disparoManualSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const data = await createManualDisparo(
      admin,
      params.id,
      {
        received_at: new Date(parsed.data.received_at).toISOString(),
        funnel_label: parsed.data.funnel_label,
        campaign_name: parsed.data.campaign_name,
        template_name: parsed.data.template_name,
        responsible_name: parsed.data.responsible_name,
        volume_sent: parsed.data.volume_sent,
        volume_delivered: parsed.data.volume_delivered,
        volume_read: parsed.data.volume_read,
        volume_replied: parsed.data.volume_replied,
        volume_failed: parsed.data.volume_failed,
        cost: parsed.data.cost,
      },
      { actorId: user.id }
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/mentorias/[id]/disparos]", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
