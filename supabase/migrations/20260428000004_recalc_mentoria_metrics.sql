-- =============================================================================
-- 20260428000004_recalc_mentoria_metrics.sql
-- =============================================================================
-- Resolve Bug #7 do code review: recalcMentoriaMetricsFromLeads é chamado
-- em toda mutation de lead (create, update, delete, bulk insert, attendance,
-- group). Sob concorrência (importer + edição manual ao mesmo tempo), os
-- read-baseline → compute → insert se intercalam de forma não-determinística.
--
-- O PR #54 adicionou um mutex in-process per-mentoria que serializa dentro
-- do mesmo Node worker. Mas isso não cobre concorrência cross-instance
-- (Vercel com múltiplos processos / Edge functions paralelas).
--
-- Esta RPC usa pg_try_advisory_xact_lock() para garantir que apenas uma
-- transação por mentoria_id execute o recalc por vez. Se o lock estiver
-- ocupado, retorna sem inserir nada (próxima mutação cobrirá o estado
-- atual de qualquer jeito — recalc é idempotente).
--
-- A função em si é equivalente ao recalcMentoriaMetricsFromLeads em JS:
-- pega a baseline (latest snapshot), pega as live stats via
-- get_mentoria_lead_stats, e insere uma snapshot nova.
-- =============================================================================

CREATE OR REPLACE FUNCTION recalc_mentoria_metrics_locked(
  p_mentoria_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
AS $$
DECLARE
  v_lock_acquired BOOLEAN;
  v_lock_key BIGINT;
  v_baseline RECORD;
  v_stats RECORD;
BEGIN
  -- Advisory lock por mentoria. hashtext() colapsa o UUID em int4; convertemos
  -- pra int8 pra usar pg_try_advisory_xact_lock(bigint).
  v_lock_key := hashtext(p_mentoria_id::TEXT)::BIGINT;
  v_lock_acquired := pg_try_advisory_xact_lock(v_lock_key);

  IF NOT v_lock_acquired THEN
    -- Outra transação já está fazendo o recalc dessa mentoria. Saímos sem
    -- inserir — a transação ativa vai cobrir o estado mais recente, então
    -- pular essa execução é seguro (recalc é idempotente).
    RETURN false;
  END IF;

  -- Baseline: latest snapshot de mentoria_metrics, pra carregar campos
  -- manuais (calls_realizadas, investimento_api). investimento_trafego
  -- vem da soma de mentoria_traffic_entries (após migration
  -- 20260428000001).
  SELECT
    COALESCE(mm.calls_realizadas, 0)    AS calls_realizadas,
    COALESCE(mm.investimento_api, 0)    AS investimento_api,
    COALESCE(t.total_trafego, 0)        AS investimento_trafego
  INTO v_baseline
  FROM mentorias m
  LEFT JOIN LATERAL (
    SELECT *
      FROM mentoria_metrics
     WHERE mentoria_id = m.id
     ORDER BY captured_at DESC
     LIMIT 1
  ) mm ON true
  LEFT JOIN LATERAL (
    SELECT SUM(amount)::numeric AS total_trafego
      FROM mentoria_traffic_entries
     WHERE mentoria_id = m.id
  ) t ON true
  WHERE m.id = p_mentoria_id;

  IF v_baseline IS NULL THEN
    -- Mentoria não existe ou foi soft-deleted; nada pra fazer.
    RETURN false;
  END IF;

  -- Live stats derivadas de mentoria_leads. Espelha get_mentoria_lead_stats.
  SELECT *
    INTO v_stats
    FROM get_mentoria_lead_stats(p_mentoria_id);

  INSERT INTO mentoria_metrics (
    mentoria_id,
    total_leads,
    leads_grupo,
    leads_ao_vivo,
    agendamentos,
    calls_realizadas,
    vendas,
    valor_vendas,
    valor_entrada,
    investimento_trafego,
    investimento_api,
    source,
    captured_at,
    captured_by
  ) VALUES (
    p_mentoria_id,
    COALESCE(v_stats.total_leads, 0),
    COALESCE(v_stats.leads_grupo, 0),
    COALESCE(v_stats.leads_ao_vivo, 0),
    COALESCE(v_stats.agendamentos, 0),
    v_baseline.calls_realizadas,
    COALESCE(v_stats.vendas, 0),
    COALESCE(v_stats.valor_vendas, 0),
    COALESCE(v_stats.valor_entrada, 0),
    v_baseline.investimento_trafego,
    v_baseline.investimento_api,
    'manual',
    now(),
    p_actor_id
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION recalc_mentoria_metrics_locked IS
  'Recálculo atômico de mentoria_metrics com advisory lock cross-instance. Substitui leads.service.ts:recalcMentoriaMetricsFromLeads quando aplicado.';

GRANT EXECUTE ON FUNCTION recalc_mentoria_metrics_locked(UUID, UUID)
  TO authenticated;
