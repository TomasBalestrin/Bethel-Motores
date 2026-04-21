import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import { FIELD_TYPES, METRIC_SOURCES } from "@/lib/validators/funnel";
import {
  addField,
  countFieldSnapshots,
  deleteField,
  getTemplateById,
  reorderFields,
  updateField,
  updateTemplate,
} from "@/services/funnels.service";

interface RouteParams {
  params: { id: string };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

const fieldCreateSchema = z.object({
  field_key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/i, "Use a-z, 0-9 e _"),
  label: z.string().trim().min(1).max(120),
  field_type: z.enum(FIELD_TYPES),
  unit: z.string().trim().max(20).optional().nullable(),
  default_source: z.enum(METRIC_SOURCES),
  is_required: z.boolean().optional(),
  is_aggregable: z.boolean().optional(),
});

const fieldUpdateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(120).optional(),
  field_type: z.enum(FIELD_TYPES).optional(),
  unit: z.string().trim().max(20).optional().nullable(),
  default_source: z.enum(METRIC_SOURCES).optional(),
  is_required: z.boolean().optional(),
  is_aggregable: z.boolean().optional(),
});

const templatePatchSchema = z.object({
  template: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().max(2000).optional().nullable(),
      is_default: z.boolean().optional(),
    })
    .optional(),
  addField: fieldCreateSchema.optional(),
  updateField: fieldUpdateSchema.optional(),
  deleteField: z
    .object({
      id: z.string().uuid(),
      confirmEvenWithSnapshots: z.boolean().optional(),
    })
    .optional(),
  reorder: z
    .array(
      z.object({
        id: z.string().uuid(),
        display_order: z.number().int().nonnegative(),
      })
    )
    .optional(),
});

export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    const data = await getTemplateById(supabase, params.id);
    if (!data) {
      return NextResponse.json(
        { error: "Template não encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/funnel-templates/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
      "gestor_infra",
    ]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const parsed = templatePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const { template, addField: addFieldInput, updateField: updateFieldInput, deleteField: deleteFieldInput, reorder } = parsed.data;

    if (template) {
      const patch: Parameters<typeof updateTemplate>[2] = {};
      if (template.name !== undefined) patch.name = template.name;
      if (template.description !== undefined)
        patch.description = template.description;
      if (template.is_default !== undefined)
        patch.is_default = template.is_default;
      if (Object.keys(patch).length > 0) {
        await updateTemplate(supabase, params.id, patch);
      }
    }

    if (addFieldInput) {
      const current = await getTemplateById(supabase, params.id);
      const nextOrder = (current?.fields?.length ?? 0) + 1;
      await addField(supabase, params.id, {
        field_key: addFieldInput.field_key,
        label: addFieldInput.label,
        field_type: addFieldInput.field_type,
        unit: addFieldInput.unit ?? null,
        default_source: addFieldInput.default_source,
        display_order: nextOrder,
        is_required: addFieldInput.is_required ?? false,
        is_aggregable: addFieldInput.is_aggregable ?? true,
      });
    }

    if (updateFieldInput) {
      const { id, ...patch } = updateFieldInput;
      await updateField(supabase, id, patch);
    }

    if (deleteFieldInput) {
      const current = await getTemplateById(supabase, params.id);
      const targetField = current?.fields?.find(
        (field) => field.id === deleteFieldInput.id
      );
      const snapshots = targetField
        ? await countFieldSnapshots(
            supabase,
            params.id,
            targetField.field_key
          )
        : 0;

      if (snapshots > 0 && !deleteFieldInput.confirmEvenWithSnapshots) {
        return NextResponse.json(
          {
            error: "Campo possui snapshots",
            warning: `${snapshots} snapshots — campo ficará oculto mas snapshots preservados`,
            snapshots,
          },
          { status: 409 }
        );
      }

      await deleteField(supabase, deleteFieldInput.id);
    }

    if (reorder && reorder.length > 0) {
      await reorderFields(supabase, reorder);
    }

    const data = await getTemplateById(supabase, params.id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PATCH /api/funnel-templates/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
