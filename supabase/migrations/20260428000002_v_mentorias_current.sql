-- =============================================================================
-- 20260428000002_v_mentorias_current.sql
-- =============================================================================
-- Cria a view v_mentorias_current — documentada em schema.md desde o início
-- mas nunca aplicada. Resolve dois problemas do code review:
--
-- - Bug #3: hoje o app embedda mentoria_metrics no select sem order/limit,
--   trazendo TODAS as snapshots por mentoria (~200 cada após 6 meses) e
--   filtrando em JS. A view faz LATERAL+LIMIT 1 no banco, com índice
--   idx_mentoria_metrics_mentoria(mentoria_id, captured_at DESC).
--
-- - Bug #14 (qualidade): pct_comparecimento, pct_agendamento, etc. são
--   calculados no client em lib/utils/calc.ts. Quando a regra muda (ex:
--   incluir desistências no denominador), só uma das pontas muda → drift.
--   A view calcula tudo em SQL.
--
-- Depende da migration 20260428000001 (mentoria_traffic_entries) — usa-a
-- pra somar trafego cumulativo, em vez de pegar a última snapshot (que
-- carregaria só um delta).
-- =============================================================================

CREATE OR REPLACE VIEW v_mentorias_current AS
SELECT
  m.id,
  m.name,
  m.scheduled_at,
  m.specialist_id,
  m.traffic_budget,
  m.status,
  m.created_by,
  m.created_at,
  m.updated_at,
  -- Estado das métricas: latest snapshot (mentoria_metrics agora é puramente
  -- snapshot-only após a migration 20260428000001).
  COALESCE(mm.total_leads, 0)         AS total_leads,
  COALESCE(mm.leads_grupo, 0)         AS leads_grupo,
  COALESCE(mm.leads_ao_vivo, 0)       AS leads_ao_vivo,
  COALESCE(mm.agendamentos, 0)        AS agendamentos,
  COALESCE(mm.calls_realizadas, 0)    AS calls_realizadas,
  COALESCE(mm.vendas, 0)              AS vendas,
  COALESCE(mm.valor_vendas, 0)        AS valor_vendas,
  COALESCE(mm.valor_entrada, 0)       AS valor_entrada,
  -- Tráfego cumulativo: SUM da nova tabela. mentoria_metrics deixou de
  -- carregar essa info após a separação.
  COALESCE(t.investimento_trafego_total, 0) AS investimento_trafego,
  COALESCE(mm.investimento_api, 0)    AS investimento_api,
  (COALESCE(t.investimento_trafego_total, 0) + COALESCE(mm.investimento_api, 0))
                                      AS investimento_total,
  mm.captured_at                      AS last_metric_at,
  -- % derivados, calculados em SQL pra garantir uma única fonte de verdade.
  -- Espelham lib/utils/calc.ts:calcPercent.
  CASE WHEN COALESCE(mm.leads_grupo, 0) > 0
       THEN ROUND((mm.leads_ao_vivo::numeric / mm.leads_grupo) * 100, 1)
       ELSE 0 END                     AS pct_comparecimento,
  CASE WHEN COALESCE(mm.leads_ao_vivo, 0) > 0
       THEN ROUND((mm.agendamentos::numeric / mm.leads_ao_vivo) * 100, 1)
       ELSE 0 END                     AS pct_agendamento,
  CASE WHEN COALESCE(mm.agendamentos, 0) > 0
       THEN ROUND((mm.calls_realizadas::numeric / mm.agendamentos) * 100, 1)
       ELSE 0 END                     AS pct_comparecimento_call,
  CASE WHEN COALESCE(mm.calls_realizadas, 0) > 0
       THEN ROUND((mm.vendas::numeric / mm.calls_realizadas) * 100, 1)
       ELSE 0 END                     AS pct_conversao_call,
  (mm.captured_at IS NULL)            AS sem_debriefing
FROM mentorias m
LEFT JOIN LATERAL (
  SELECT *
    FROM mentoria_metrics
   WHERE mentoria_id = m.id
   ORDER BY captured_at DESC
   LIMIT 1
) mm ON true
LEFT JOIN LATERAL (
  SELECT SUM(amount)::numeric AS investimento_trafego_total
    FROM mentoria_traffic_entries
   WHERE mentoria_id = m.id
) t ON true
WHERE m.deleted_at IS NULL;

COMMENT ON VIEW v_mentorias_current IS
  'Estado atual de cada mentoria: última snapshot de métricas + tráfego cumulativo + % derivados. Substitui o pattern atual de embeddar mentoria_metrics e calcular % no client.';
