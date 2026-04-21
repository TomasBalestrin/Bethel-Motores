import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/guard";
import {
  MetaAdsApiError,
  fetchCampaignInsights,
} from "@/lib/integrations/meta-ads-adapter";
import {
  syncMetaAdsSpend,
  type MetaAdsMapping,
} from "@/services/integrations.service";

const syncSchema = z.object({
  date_preset: z
    .enum(["today", "yesterday", "last_7d", "last_30d"])
    .optional(),
  mappings: z
    .array(
      z.object({
        campaign_id: z.string().min(1),
        target_type: z.enum(["post", "mentoria"]),
        target_id: z.string().uuid(),
      })
    )
    .min(1),
});

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

    const accessToken = process.env.META_ADS_ACCESS_TOKEN;
    const accountId = process.env.META_ADS_ACCOUNT_ID;
    if (!accessToken || !accountId) {
      return NextResponse.json(
        {
          error:
            "META_ADS_ACCESS_TOKEN ou META_ADS_ACCOUNT_ID não configurados",
        },
        { status: 422 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    let insights;
    try {
      insights = await fetchCampaignInsights({
        accountId,
        accessToken,
        datePreset: parsed.data.date_preset ?? "yesterday",
      });
    } catch (error) {
      if (error instanceof MetaAdsApiError) {
        console.error("[META_ADS]", error.message, {
          status: error.status,
          code: error.code,
          fbTrace: error.fbTrace,
        });
        return NextResponse.json(
          {
            error: `Meta Graph API: ${error.message}`,
            details: {
              status: error.status,
              code: error.code,
              fbTrace: error.fbTrace,
            },
          },
          { status: 502 }
        );
      }
      throw error;
    }

    const result = await syncMetaAdsSpend(supabase, {
      insights,
      mappings: parsed.data.mappings as MetaAdsMapping[],
      actorId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[POST /api/integrations/meta-ads/sync]", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
