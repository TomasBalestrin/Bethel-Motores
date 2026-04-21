import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getMotorStats } from "@/services/mentorias.service";
import { resolvePeriodFromSearchParams } from "@/components/dashboard/PeriodFilter";

interface RouteParams {
  params: { slug: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (params.slug !== "mentorias") {
      return NextResponse.json(
        { error: "Motor sem stats configurados" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = resolvePeriodFromSearchParams({
      period: searchParams.get("period") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    const data = await getMotorStats(supabase, period.range);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/motors/[slug]/stats]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
