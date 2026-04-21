import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { listAudit } from "@/services/audit.service";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const data = await listAudit(supabase, {
      entityType: searchParams.get("entity_type") ?? undefined,
      userId: searchParams.get("user_id") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      limit: Number(searchParams.get("limit") ?? "200") || undefined,
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/audit-logs]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
