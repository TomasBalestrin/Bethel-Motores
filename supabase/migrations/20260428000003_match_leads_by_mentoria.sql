-- =============================================================================
-- 20260428000003_match_leads_by_mentoria.sql
-- =============================================================================
-- Move o matching de leads (markAttendanceByMatching, markGroupByMatching) do
-- client pro server. Resolve Bug #8 do code review:
--
-- Hoje o app pagina mentoria_leads em batches de 1000 até cobrir todos os
-- leads da mentoria, monta índices em JS (byPhone, byName), e faz JOIN
-- in-memory contra os entries do CSV. Para 50k leads são ~50 round-trips
-- sequenciais — fácil estourar timeout do Vercel (10s free, 60s pro).
--
-- O PR #54 já adicionou um bound de 30k leads + erro 413 explícito como
-- mitigação, mas a solução real é mover o matching pra SQL.
--
-- Esta RPC recebe a lista de entries do CSV (name/phone/instagram_handle)
-- como TABLE-typed argument e devolve os IDs dos leads que casaram, mais
-- as entries que não tiveram match. Tudo num único round-trip.
-- =============================================================================

-- Type estruturado pros entries do CSV — evita JSONB não-tipado.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'lead_match_entry'
  ) THEN
    CREATE TYPE lead_match_entry AS (
      idx INTEGER,
      name TEXT,
      phone TEXT,
      instagram_handle TEXT
    );
  END IF;
END $$;

-- Pré-requisito: extensão unaccent (espelha lib/utils/matching.ts).
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Helpers de normalização — espelham lib/utils/matching.ts pra que o
-- comportamento server-side bata com o que a UI já mostra.
CREATE OR REPLACE FUNCTION normalize_phone(value TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF value IS NULL THEN RETURN NULL; END IF;
  cleaned := regexp_replace(value, '[^0-9]', '', 'g');
  IF cleaned = '' THEN RETURN NULL; END IF;
  -- Pega só os últimos 11 dígitos (DDD + número), descartando código do país
  -- e zeros à esquerda. Casa o comportamento do phoneIndexKey() em JS.
  RETURN RIGHT(cleaned, 11);
END;
$$;

CREATE OR REPLACE FUNCTION normalize_name(value TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF value IS NULL THEN RETURN NULL; END IF;
  cleaned := lower(unaccent(trim(value)));
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  IF cleaned = '' THEN RETURN NULL; END IF;
  RETURN cleaned;
END;
$$;

-- =============================================================================
-- match_leads_by_mentoria
-- =============================================================================
-- Retorna duas listas:
--   - matched_lead_ids: IDs dos leads da mentoria que casaram com algum entry
--   - not_matched_indexes: índices das entries do CSV sem match
--
-- O caller pode então fazer UPDATE em lote dos leads matched e exibir as
-- entries não-matched na UI.
--
-- Match priority: phone exato (após normalização) > nome exato (lowercase
-- + sem acento + colapso de espaços). Instagram handle não usado aqui
-- porque o CSV de comparecimento normalmente não traz handle.
-- =============================================================================

CREATE OR REPLACE FUNCTION match_leads_by_mentoria(
  p_mentoria_id UUID,
  p_entries lead_match_entry[]
)
RETURNS TABLE (
  matched_lead_ids UUID[],
  not_matched_indexes INTEGER[]
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH funnel_ids AS (
    SELECT id FROM funnels
     WHERE mentoria_id = p_mentoria_id
       AND deleted_at IS NULL
  ),
  entries AS (
    SELECT
      e.idx,
      normalize_phone(e.phone) AS phone_key,
      normalize_name(e.name)   AS name_key
    FROM unnest(p_entries) e
  ),
  matches AS (
    SELECT DISTINCT
      e.idx,
      l.id AS lead_id
    FROM entries e
    JOIN mentoria_leads l
      ON l.funnel_id IN (SELECT id FROM funnel_ids)
     AND l.deleted_at IS NULL
     AND (
       (e.phone_key IS NOT NULL AND normalize_phone(l.phone) = e.phone_key)
       OR
       (e.name_key  IS NOT NULL AND normalize_name(l.name)   = e.name_key)
     )
  )
  SELECT
    (SELECT COALESCE(array_agg(DISTINCT lead_id), ARRAY[]::UUID[])
       FROM matches) AS matched_lead_ids,
    (SELECT COALESCE(array_agg(idx ORDER BY idx), ARRAY[]::INTEGER[])
       FROM entries
      WHERE idx NOT IN (SELECT idx FROM matches)) AS not_matched_indexes;
END;
$$;

COMMENT ON FUNCTION match_leads_by_mentoria IS
  'Server-side matching de CSV (name/phone) contra leads da mentoria. Substitui o loop client-side em paginated batches do leads.service.ts:fetchAllLeadsForMatching.';

-- Permissões — espelham as roles que já podem chamar
-- markAttendanceByMatching/markGroupByMatching nas routes API.
GRANT EXECUTE ON FUNCTION match_leads_by_mentoria(UUID, lead_match_entry[])
  TO authenticated;
