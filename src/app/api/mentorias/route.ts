import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import {
  mentoriaCreateSchema,
  MENTORIA_STATUSES,
  MENTORIA_SORT_OPTIONS,
  type MentoriaStatus,
  type MentoriaSort,
} from "@/lib/validators/mentoria";
import {
  createMentoria,
  listMentorias,
} from "@/services/mentorias.service";

function parseStatus(value: string | null): MentoriaStatus | "all" {
  if (!value || value === "all") return "all";
  return (MENTORIA_STATUSES as readonly string[]).includes(value)
    ? (value as MentoriaStatus)
    : "all";
}

function parseSort(value: string | null): MentoriaSort {
  if (!value) return "recent";
  return (MENTORIA_SORT_OPTIONS as readonly string[]).includes(value)
    ? (value as MentoriaSort)
    : "recent";
}

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
    const data = await listMentorias(supabase, {
      query: searchParams.get("query")?.trim() || undefined,
      status: parseStatus(searchParams.get("status")),
      sort: parseSort(searchParams.get("sort")),
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/mentorias]", error);
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

    const parsed = mentoriaCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const mentoria = await createMentoria(supabase, parsed.data, {
      actorId: user.id,
    });

    return NextResponse.json({ data: mentoria }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/mentorias]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
