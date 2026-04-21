import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mappingSchema,
  type IntegrationMapping,
  type MappingTargetTable,
} from "@/lib/validators/integration";

function readPath(payload: unknown, path: string): unknown {
  if (!path) return undefined;
  const segments = path.split(".");
  let cursor: unknown = payload;
  for (const segment of segments) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

interface MentoriaMetricRowPayload {
  mentoria_id: string;
  source: "webhook" | "api";
  captured_at: string;
  leads_grupo: number;
  leads_ao_vivo: number;
  agendamentos: number;
  calls_realizadas: number;
  vendas: number;
  valor_vendas: number;
  valor_entrada: number;
  investimento_trafego: number;
  investimento_api: number;
}

interface FunnelSnapshotRowPayload {
  funnel_id: string;
  field_key: string;
  value_numeric: number | null;
  value_text: string | null;
  source: "webhook" | "api";
  source_ref: string | null;
}

export interface ProcessResult {
  ok: boolean;
  appliedTo: MappingTargetTable[];
  skipped: string[];
  error?: string;
}

interface ProcessOptions {
  source: {
    type: "fluxon" | "meta_ads" | "generic";
  };
  sourceEventId: string | null;
  mentoriaId: string | null;
}

export async function processWebhook(
  supabase: SupabaseClient,
  rawMapping: unknown,
  payload: Record<string, unknown>,
  options: ProcessOptions
): Promise<ProcessResult> {
  const parsedMapping = mappingSchema.safeParse(rawMapping);
  if (!parsedMapping.success) {
    return {
      ok: false,
      appliedTo: [],
      skipped: [],
      error: "Mapping inválido",
    };
  }

  const mapping: IntegrationMapping = parsedMapping.data;

  const mentoriaIdFromPayload =
    options.mentoriaId ??
    (mapping.mentoria_id_path
      ? asText(readPath(payload, mapping.mentoria_id_path))
      : null);

  const funnelIdFromPayload = mapping.funnel_id_path
    ? asText(readPath(payload, mapping.funnel_id_path))
    : null;

  const sourceTag: "webhook" | "api" =
    options.source.type === "meta_ads" ? "api" : "webhook";

  const skipped: string[] = [];
  const appliedTo = new Set<MappingTargetTable>();

  const mentoriaMetric: MentoriaMetricRowPayload = {
    mentoria_id: mentoriaIdFromPayload ?? "",
    source: sourceTag,
    captured_at: new Date().toISOString(),
    leads_grupo: 0,
    leads_ao_vivo: 0,
    agendamentos: 0,
    calls_realizadas: 0,
    vendas: 0,
    valor_vendas: 0,
    valor_entrada: 0,
    investimento_trafego: 0,
    investimento_api: 0,
  };

  const funnelSnapshots: FunnelSnapshotRowPayload[] = [];

  for (const field of mapping.fields) {
    const raw = readPath(payload, field.source_path);
    if (raw === undefined) {
      skipped.push(field.source_path);
      continue;
    }

    if (field.target_table === "mentoria_metrics") {
      const numeric = asNumber(raw) ?? 0;
      const target = field.target_field as keyof MentoriaMetricRowPayload;
      if (
        target === "leads_grupo" ||
        target === "leads_ao_vivo" ||
        target === "agendamentos" ||
        target === "calls_realizadas" ||
        target === "vendas" ||
        target === "valor_vendas" ||
        target === "valor_entrada" ||
        target === "investimento_trafego" ||
        target === "investimento_api"
      ) {
        mentoriaMetric[target] = numeric;
        appliedTo.add("mentoria_metrics");
      } else {
        skipped.push(field.source_path);
      }
      continue;
    }

    if (field.target_table === "funnel_metric_snapshots") {
      if (!funnelIdFromPayload) {
        skipped.push(field.source_path);
        continue;
      }
      funnelSnapshots.push({
        funnel_id: funnelIdFromPayload,
        field_key: field.funnel_field_key ?? field.target_field,
        value_numeric: asNumber(raw),
        value_text: typeof raw === "string" ? raw : null,
        source: sourceTag,
        source_ref: options.sourceEventId,
      });
      appliedTo.add("funnel_metric_snapshots");
    }
  }

  if (appliedTo.has("mentoria_metrics")) {
    if (!mentoriaMetric.mentoria_id) {
      return {
        ok: false,
        appliedTo: [],
        skipped,
        error: "mentoria_id ausente no payload",
      };
    }
    const { error } = await supabase
      .from("mentoria_metrics")
      .insert(mentoriaMetric);
    if (error) {
      return { ok: false, appliedTo: [], skipped, error: error.message };
    }
  }

  if (appliedTo.has("funnel_metric_snapshots") && funnelSnapshots.length > 0) {
    const { error } = await supabase
      .from("funnel_metric_snapshots")
      .insert(funnelSnapshots);
    if (error) {
      return {
        ok: false,
        appliedTo: ["mentoria_metrics"].filter((t) =>
          appliedTo.has(t as MappingTargetTable)
        ) as MappingTargetTable[],
        skipped,
        error: error.message,
      };
    }
  }

  return { ok: true, appliedTo: Array.from(appliedTo), skipped };
}
