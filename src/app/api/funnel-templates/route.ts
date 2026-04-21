import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { FIELD_TYPES, METRIC_SOURCES } from "@/lib/validators/funnel";
import {
  addField,
  createTemplate,
  listTemplates,
} from "@/services/funnels.service";

const templateCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  is_default: z.boolean().optional(),
  fields: z
    .array(
      z.object({
        field_key: z
          .string()
          .trim()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9_]+$/i, "Use a-z, 0-9 e _"),
        label: z.string().trim().min(1).max(120),
        field_type: z.enum(FIELD_TYPES),
        unit: z.string().trim().max(20).optional().nullable(),
        default_source: z.enum(METRIC_SOURCES).default("manual"),
        is_required: z.boolean().optional(),
        is_aggregable: z.boolean().optional(),
      })
    )
    .optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const data = await listTemplates(supabase);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/funnel-templates]", error);
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
      "gestor_infra",
    ]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const parsed = templateCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const template = await createTemplate(
      supabase,
      {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        is_default: parsed.data.is_default,
      },
      { actorId: user.id }
    );

    if (parsed.data.fields && parsed.data.fields.length > 0) {
      let order = 1;
      for (const field of parsed.data.fields) {
        await addField(supabase, template.id, {
          field_key: field.field_key,
          label: field.label,
          field_type: field.field_type,
          unit: field.unit ?? null,
          default_source: field.default_source,
          display_order: order++,
          is_required: field.is_required ?? false,
          is_aggregable: field.is_aggregable ?? true,
        });
      }
    }

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/funnel-templates]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
