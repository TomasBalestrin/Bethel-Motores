/**
 * Fan-out de `data.templates[]` do payload Fluxon em N eventos filhos
 * representando 1 disparo cada (com volume e custo por template).
 *
 * Por que existe:
 * O Fluxon manda 1 webhook agregado com `data.templates[]` (breakdown por template).
 * `toDisparoDTO` (mentorias.service.ts) faz BFS no payload e indexa só o PRIMEIRO valor
 * encontrado pra cada chave. Resultado: só o primeiro template aparece na tela de Disparos
 * e o `cost_brl` (que não está na lista de aliases do `pickNumberFromIndex`) vira R$ 0.
 *
 * Solução: explodir o array em N rows de `integration_events`, cada uma com payload
 * formato compatível com `toDisparoDTO` (`volume_sent`, `cost`, `template_name`, etc.).
 * Cada filha tem `source_event_id` único composto do pai pra ser idempotente em re-envios.
 *
 * O evento agregado original continua sendo gravado e processado por `processWebhook`
 * (popula `mentoria_metrics`). Esta função APENAS adiciona rows de visualização.
 */

export interface FluxonTemplateBreakdown {
  name: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  cost_brl: number;
  cost_usd?: number;
  links_criados?: number;
  links_clicados?: number;
  cliques_total?: number;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Extrai e normaliza o array `data.templates[]` do payload Fluxon. Aceita campos
 * ausentes (zera) e ignora itens não-objeto.
 */
export function extractFluxonTemplates(
  payload: Record<string, unknown>
): FluxonTemplateBreakdown[] {
  const data = payload?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const templates = (data as Record<string, unknown>).templates;
  if (!Array.isArray(templates)) return [];

  const out: FluxonTemplateBreakdown[] = [];
  for (const raw of templates) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const t = raw as Record<string, unknown>;
    const name =
      typeof t.name === "string" && t.name.trim().length > 0
        ? t.name.trim()
        : null;
    if (!name) continue;
    out.push({
      name,
      sent: asNumber(t.sent),
      delivered: asNumber(t.delivered),
      read: asNumber(t.read),
      failed: asNumber(t.failed),
      cost_brl: asNumber(t.cost_brl),
      cost_usd: asOptionalNumber(t.cost_usd),
      links_criados: asOptionalNumber(t.links_criados),
      links_clicados: asOptionalNumber(t.links_clicados),
      cliques_total: asOptionalNumber(t.cliques_total),
    });
  }
  return out;
}

export interface BuildDisparoChildPayloadInput {
  parentSourceEventId: string;
  index: number;
  template: FluxonTemplateBreakdown;
}

export interface DisparoChildPayload {
  payload: Record<string, unknown>;
  sourceEventId: string;
}

/**
 * Constrói o payload no formato que `toDisparoDTO` consome corretamente
 * (chaves canônicas: volume_sent, volume_delivered, volume_read, volume_failed,
 * volume_replied, cost, template_name, campaign_name, source).
 *
 * Usa o `parentSourceEventId` + index pra gerar `source_event_id` único e
 * idempotente em re-envios (a unique de `(source_id, source_event_id)` evita duplicação).
 */
export function buildDisparoChildPayload(
  input: BuildDisparoChildPayloadInput
): DisparoChildPayload {
  const t = input.template;
  return {
    payload: {
      volume: t.sent,
      volume_sent: t.sent,
      volume_delivered: t.delivered,
      volume_read: t.read,
      volume_replied: 0,
      volume_failed: t.failed,
      cost: t.cost_brl,
      cost_brl: t.cost_brl,
      cost_usd: t.cost_usd ?? 0,
      template_name: t.name,
      campaign_name: t.name,
      funnel_name: null,
      responsible_name: null,
      source: "webhook_template_breakdown",
      links_criados: t.links_criados ?? 0,
      links_clicados: t.links_clicados ?? 0,
      cliques_total: t.cliques_total ?? 0,
    },
    sourceEventId: `${input.parentSourceEventId}:tpl:${input.index}`,
  };
}
