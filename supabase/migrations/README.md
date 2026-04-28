# Supabase migrations

Cada arquivo é idempotente (`IF NOT EXISTS`, `OR REPLACE`) e aplica em
ordem de timestamp. Numeração: `YYYYMMDDHHmmss_descricao.sql`.

Aplicar com:

```bash
supabase db push
# ou, manualmente:
psql "$DATABASE_URL" -f supabase/migrations/20260428000001_mentoria_traffic_entries.sql
```

## Lote 2026-04-28: separação de trafego + view + RPCs server-side

Resolve os 4 bugs do PR #54 que ficaram fora de escopo por exigirem
mudança de schema. Aplicar **na ordem**:

| # | Migration | Resolve |
|---|-----------|---------|
| 1 | `20260428000001_mentoria_traffic_entries.sql` | Bug #1 (raiz) — separa deltas de tráfego de snapshots de estado |
| 2 | `20260428000002_v_mentorias_current.sql` | Bugs #3, #14 — uma view com latest snapshot + soma trafego + % calculados em SQL |
| 3 | `20260428000003_match_leads_by_mentoria.sql` | Bug #8 — matching server-side num único round-trip |
| 4 | `20260428000004_recalc_mentoria_metrics.sql` | Bug #7 — recalc com advisory lock cross-instance |

### Backfill em produção

A migration #1 move rows de `mentoria_metrics` (filtradas por
`platform IS NOT NULL`) para `mentoria_traffic_entries` e depois remove
as rows movidas. **Faça backup antes**:

```sql
-- snapshot pré-migration
CREATE TABLE mentoria_metrics_backup_20260428 AS
  SELECT * FROM mentoria_metrics WHERE platform IS NOT NULL;
```

Em DB pequeno (< 100k rows em `mentoria_metrics`) o backfill roda em
segundos. Em DB grande, considere migration em janelas:

```sql
-- janela 1: rows de 2025
INSERT INTO mentoria_traffic_entries (...)
SELECT ... FROM mentoria_metrics
WHERE platform IS NOT NULL
  AND captured_at >= '2025-01-01' AND captured_at < '2026-01-01';
```

### Wire-up no app (PR de follow-up)

Estas migrations **não** quebram o app atual — `mentoria_metrics`
continua sendo lido pelos pontos existentes. Mas elas habilitam
simplificações que devem entrar num PR separado, depois do deploy:

- `mentorias.service.ts:listMentorias / compareByIds /
  getMentoriaWithMetricsById` → trocar `MENTORIA_SELECT` + cálculos por
  `SELECT * FROM v_mentorias_current`
- `mentorias.service.ts:insertTrafegoEntry / insertTrafegoBatch` →
  escrever em `mentoria_traffic_entries` em vez de `mentoria_metrics`
- `mentorias.service.ts:listTrafegoByMentoria / getTrafegoKPIs` → ler de
  `mentoria_traffic_entries`
- `leads.service.ts:markAttendanceByMatching / markGroupByMatching` →
  trocar `fetchAllLeadsForMatching` + indexação JS pela RPC
  `match_leads_by_mentoria`. Remove o limite de 30k leads e o
  `MatchingTooLargeError`.
- `leads.service.ts:recalcMentoriaMetricsFromLeads` → trocar
  read-baseline + insert por `SELECT recalc_mentoria_metrics_locked(id)`.
  Remove o `Map<id, Promise>` mutex in-process (advisory lock cobre
  cross-instance).

### Cleanup posterior

Quando o app não escrever mais em `mentoria_metrics.platform` /
`mentoria_metrics.creative_id`, dar drop nessas colunas:

```sql
ALTER TABLE mentoria_metrics DROP COLUMN platform;
ALTER TABLE mentoria_metrics DROP COLUMN creative_id;
```
