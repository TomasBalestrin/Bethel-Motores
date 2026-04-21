import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { listUsers } from "@/services/users.service";

export async function GET() {
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

    const data = await listUsers(supabase);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
