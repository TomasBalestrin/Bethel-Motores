import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { listProfilesWithStats } from "@/services/social-profiles.service";

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
