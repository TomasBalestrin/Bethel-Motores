-- =============================================================================
-- 20260428000001_mentoria_traffic_entries.sql
-- =============================================================================
-- Resolve a dual-semântica de mentoria_metrics: a tabela hoje guarda tanto
-- snapshots de estado (do drawer / recalc de leads) quanto deltas de tráfego
-- (insertTrafegoEntry/Batch), discriminados ad-hoc por `platform IS NOT NULL`.
--
-- Esse aliasing era a raiz do Bug #1 do code review: leads_grupo, calls,
-- vendas e valor_vendas eram zerados a cada lançamento de tráfego.
-- O fix mínimo (carryover dos campos manuais) foi aplicado no PR #54, mas a
-- separação real das semânticas precisa de uma tabela própria.
--
-- Esta migration cria mentoria_traffic_entries e migra todas as rows de
-- mentoria_metrics que tinham `platform IS NOT NULL` (= eram deltas de
-- tráfego, não snapshots de estado). As rows migradas são removidas de
-- mentoria_metrics depois para deixar essa tabela 100% snapshot-only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS mentoria_traffic_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentoria_id UUID NOT NULL REFERENCES mentorias(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  platform TEXT NOT NULL DEFAULT 'meta_ads',
  creative_id UUID REFERENCES mentoria_creatives(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentoria_traffic_entries_mentoria
  ON mentoria_traffic_entries(mentoria_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentoria_traffic_entries_creative
  ON mentoria_traffic_entries(creative_id) WHERE creative_id IS NOT NULL;

ALTER TABLE mentoria_traffic_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mentoria_traffic_entries_read"
  ON mentoria_traffic_entries FOR SELECT
  USING (true);

CREATE POLICY "mentoria_traffic_entries_write"
  ON mentoria_traffic_entries FOR INSERT
  WITH CHECK (has_role(ARRAY['admin', 'gestor_trafego']::user_role[]));

CREATE POLICY "mentoria_traffic_entries_update"
  ON mentoria_traffic_entries FOR UPDATE
  USING (has_role(ARRAY['admin', 'gestor_trafego']::user_role[]));

CREATE POLICY "mentoria_traffic_entries_delete"
  ON mentoria_traffic_entries FOR DELETE
  USING (has_role(ARRAY['admin', 'gestor_trafego']::user_role[]));

-- -----------------------------------------------------------------------------
-- Backfill: move deltas de tráfego de mentoria_metrics → mentoria_traffic_entries
-- -----------------------------------------------------------------------------
-- Heurística: rows com `platform IS NOT NULL` foram criadas por
-- insertTrafegoEntry/Batch. Após o backfill, removemos essas rows de
-- mentoria_metrics para deixar essa tabela 100% snapshot-only.
-- -----------------------------------------------------------------------------

INSERT INTO mentoria_traffic_entries
  (id, mentoria_id, amount, platform, creative_id, captured_at, captured_by, created_at)
SELECT
  id,
  mentoria_id,
  COALESCE(investimento_trafego, 0),
  COALESCE(platform, 'meta_ads'),
  creative_id,
  captured_at,
  captured_by,
  created_at
FROM mentoria_metrics
WHERE platform IS NOT NULL
ON CONFLICT (id) DO NOTHING;

DELETE FROM mentoria_metrics WHERE platform IS NOT NULL;

-- mentoria_metrics não precisa mais das colunas platform/creative_id porque
-- essas semânticas vivem em mentoria_traffic_entries. Mantidas como NULL-only
-- por compatibilidade até o app ser migrado pra escrever na nova tabela.
-- (Drop dessas colunas vai numa migration de cleanup posterior, quando o app
-- já estiver 100% lendo/escrevendo na tabela nova.)
COMMENT ON COLUMN mentoria_metrics.platform IS
  'DEPRECATED — moveu pra mentoria_traffic_entries (migration 20260428000001). Não escrever mais.';
COMMENT ON COLUMN mentoria_metrics.creative_id IS
  'DEPRECATED — moveu pra mentoria_traffic_entries (migration 20260428000001). Não escrever mais.';
