> 💚 Hulk | 21/04/2026 | v1.0

# Schema — Bethel Motores

## 1. Diagrama de relacionamentos

```
auth.users 1──1 user_profiles
                     │
                     ├── N created_by em: motors, social_profiles, posts, mentorias, funnels, tasks, goals, integration_sources
                     └── N assignee em: tasks

motors 1──N social_profiles
motors 1──N mentorias (via motor_slug='mentorias')

social_profiles 1──N posts
social_profiles 1──N tasks
social_profiles 1──N mentorias.specialist_id

posts 1──N post_metrics         (snapshots, append-only)
posts 1──N post_analyses        (append-only)

mentorias 1──N mentoria_metrics (snapshots, append-only)
mentorias 1──N funnels

funnel_templates 1──N funnel_template_fields
funnel_templates 1──N funnels

funnels 1──N funnel_metric_snapshots (append-only, trinca funnel_id+field_key+captured_at)

tasks 1──N task_comments

motors 1──N motor_dashboard_cards
goals     (escopo: motor_id OR mentoria_id, exclusivo)

integration_sources 1──N integration_events
integration_events N──1 mentorias (opcional, via mentoria_id)

audit_logs (log geral)
```

---

## 2. Migration order

1. `001_extensions_enums.sql` — extensions + enums
2. `002_core_tables.sql` — user_profiles, motors, social_profiles, motor_dashboard_cards
3. `003_social_selling.sql` — posts, post_metrics, post_analyses, tasks, task_comments
4. `004_mentorias_funnels.sql` — mentorias, mentoria_metrics, funnel_templates, funnel_template_fields, funnels, funnel_metric_snapshots
5. `005_integrations.sql` — integration_sources, integration_events
6. `006_goals_audit.sql` — goals, audit_logs
7. `007_rls_policies.sql` — todas as policies
8. `008_triggers.sql` — updated_at, soft delete, snapshot triggers
9. `009_views.sql` — views para current metrics
10. `010_seed.sql` — dados dev (motores, profiles, template default)

Aplicar em ordem no SQL Editor do Supabase Dashboard.

---

## 3. 001_extensions_enums.sql

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- busca textual fuzzy
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'gestor_trafego', 'gestor_infra', 'copy');
CREATE TYPE mentoria_status AS ENUM ('em_andamento', 'concluida');
CREATE TYPE task_status AS ENUM ('backlog', 'em_andamento', 'em_revisao', 'concluido');
CREATE TYPE task_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');
CREATE TYPE analysis_type AS ENUM ('file', 'link', 'text');
CREATE TYPE field_type AS ENUM ('number', 'currency', 'percentage', 'url', 'text');
CREATE TYPE metric_source AS ENUM ('manual', 'webhook', 'api');
CREATE TYPE integration_type AS ENUM ('fluxon', 'meta_ads', 'generic_webhook');
CREATE TYPE goal_scope_type AS ENUM ('motor', 'mentoria');
CREATE TYPE integration_event_status AS ENUM ('pending', 'processed', 'error', 'duplicated');
```

---

## 4. 002_core_tables.sql

```sql
-- user_profiles: extensão de auth.users com role e metadata
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'copy',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_role ON user_profiles(role) WHERE is_active = true;

-- motors: tipos de motor (extensível)
CREATE TABLE motors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,                                          -- nome do ícone Lucide
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_motors_active ON motors(display_order) WHERE is_active = true AND deleted_at IS NULL;

-- social_profiles: perfis dentro do motor Social Selling (Cleiton, Julia, …)
CREATE TABLE social_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  motor_id UUID NOT NULL REFERENCES motors(id) ON DELETE RESTRICT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  instagram_handle TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_social_profiles_motor ON social_profiles(motor_id) WHERE is_active = true AND deleted_at IS NULL;

-- motor_dashboard_cards: config de cards macro por motor (permite reorder/hide no futuro)
CREATE TABLE motor_dashboard_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  motor_id UUID NOT NULL REFERENCES motors(id) ON DELETE CASCADE,
  card_key TEXT NOT NULL,                             -- 'mentorias_ativas', 'investimento_total', etc.
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,          -- { "format": "currency", "source": "sum(mentoria_metrics.valor_vendas)" }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(motor_id, card_key)
);

CREATE INDEX idx_dashboard_cards_motor ON motor_dashboard_cards(motor_id, display_order) WHERE is_visible = true;
```

---

## 5. 003_social_selling.sql

```sql
-- posts: criativos impulsionados
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,                                 -- livre
  link TEXT NOT NULL,                                 -- URL do post
  initial_budget NUMERIC(12, 2),                      -- orçamento cadastrado na criação
  observations TEXT,
  is_test BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_fit BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(social_profile_id, link)
);

CREATE INDEX idx_posts_profile ON posts(social_profile_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_fit ON posts(social_profile_id) WHERE is_fit = true AND deleted_at IS NULL;
CREATE INDEX idx_posts_search ON posts USING gin(code gin_trgm_ops);

-- post_metrics: snapshots append-only
CREATE TABLE post_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  investment NUMERIC(12, 2) NOT NULL DEFAULT 0,
  followers_gained INTEGER NOT NULL DEFAULT 0,
  cost_per_follower NUMERIC(12, 4) GENERATED ALWAYS AS (
    CASE WHEN followers_gained > 0 THEN investment / followers_gained ELSE NULL END
  ) STORED,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  source metric_source NOT NULL DEFAULT 'manual',
  captured_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_metrics_post ON post_metrics(post_id, captured_at DESC);

-- post_analyses: append-only, aceita 3 formatos
CREATE TABLE post_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  type analysis_type NOT NULL,
  file_url TEXT,                                      -- quando type=file (Supabase Storage)
  file_name TEXT,
  external_url TEXT,                                  -- quando type=link
  content_text TEXT,                                  -- quando type=text
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT analysis_content_check CHECK (
    (type = 'file' AND file_url IS NOT NULL) OR
    (type = 'link' AND external_url IS NOT NULL) OR
    (type = 'text' AND content_text IS NOT NULL)
  )
);

CREATE INDEX idx_post_analyses_post ON post_analyses(post_id, created_at DESC);

-- tasks: kanban por perfil
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'backlog',
  priority task_priority NOT NULL DEFAULT 'media',
  position NUMERIC(20, 10) NOT NULL DEFAULT 0,        -- permite inserir no meio sem renumerar
  assignee_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  due_date DATE,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ                              -- soft delete (arquivar)
);

CREATE INDEX idx_tasks_board ON tasks(social_profile_id, status, position) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE deleted_at IS NULL;

-- task_comments
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id, created_at DESC);
```

---

## 6. 004_mentorias_funnels.sql

```sql
-- mentorias
CREATE TABLE mentorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  specialist_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE RESTRICT,
  traffic_budget NUMERIC(12, 2),
  status mentoria_status NOT NULL DEFAULT 'em_andamento',
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mentorias_scheduled ON mentorias(scheduled_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_mentorias_status ON mentorias(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_mentorias_specialist ON mentorias(specialist_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_mentorias_search ON mentorias USING gin(name gin_trgm_ops);

-- mentoria_metrics: snapshots append-only das métricas agregadas
CREATE TABLE mentoria_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentoria_id UUID NOT NULL REFERENCES mentorias(id) ON DELETE CASCADE,
  leads_grupo INTEGER NOT NULL DEFAULT 0,
  leads_ao_vivo INTEGER NOT NULL DEFAULT 0,
  agendamentos INTEGER NOT NULL DEFAULT 0,
  calls_realizadas INTEGER NOT NULL DEFAULT 0,
  vendas INTEGER NOT NULL DEFAULT 0,
  valor_vendas NUMERIC(14, 2) NOT NULL DEFAULT 0,
  valor_entrada NUMERIC(14, 2) NOT NULL DEFAULT 0,
  investimento_trafego NUMERIC(14, 2) NOT NULL DEFAULT 0,
  investimento_api NUMERIC(14, 2) NOT NULL DEFAULT 0,
  source metric_source NOT NULL DEFAULT 'manual',
  captured_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentoria_metrics_mentoria ON mentoria_metrics(mentoria_id, captured_at DESC);

-- funnel_templates: schema de indicadores de funil
CREATE TABLE funnel_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- único default ativo
CREATE UNIQUE INDEX idx_funnel_template_default ON funnel_templates(is_default) WHERE is_default = true AND deleted_at IS NULL;

-- funnel_template_fields: campos de um template
CREATE TABLE funnel_template_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES funnel_templates(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,                            -- 'leads', 'qualificados', 'no_grupo', etc.
  label TEXT NOT NULL,
  field_type field_type NOT NULL DEFAULT 'number',
  unit TEXT,                                          -- 'R$', '%', etc. (opcional; preferir field_type)
  default_source metric_source NOT NULL DEFAULT 'manual',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_aggregable BOOLEAN NOT NULL DEFAULT true,        -- pode ser somado em comparações
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, field_key)
);

CREATE INDEX idx_funnel_template_fields_template ON funnel_template_fields(template_id, display_order);

-- funnels: instância de funil vinculada a uma mentoria
CREATE TABLE funnels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentoria_id UUID NOT NULL REFERENCES mentorias(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES funnel_templates(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  list_url TEXT,                                      -- "link da lista do funil"
  is_traffic_funnel BOOLEAN NOT NULL DEFAULT false,   -- para agregar em "captação tráfego total"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_funnels_mentoria ON funnels(mentoria_id) WHERE deleted_at IS NULL AND is_active = true;

-- funnel_metric_snapshots: histórico de valores por campo
-- NOTA: guardamos field_key como TEXT (não FK) para sobreviver a alterações no template.
CREATE TABLE funnel_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  value_numeric NUMERIC(16, 4),
  value_text TEXT,
  source metric_source NOT NULL DEFAULT 'manual',
  source_ref TEXT,                                    -- id externo (ex: evento do Fluxon) pra dedup
  captured_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_funnel_snapshots_current ON funnel_metric_snapshots(funnel_id, field_key, captured_at DESC);
CREATE INDEX idx_funnel_snapshots_dedup ON funnel_metric_snapshots(source_ref) WHERE source_ref IS NOT NULL;
```

---

## 7. 005_integrations.sql

```sql
-- integration_sources: fontes externas (Fluxon, Meta Ads, webhook genérico)
CREATE TABLE integration_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,                          -- usado na rota /api/webhooks/[slug]
  name TEXT NOT NULL,
  type integration_type NOT NULL,
  webhook_secret_hash TEXT,                           -- bcrypt do secret (salt por linha)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,          -- credenciais específicas da fonte
  mapping JSONB NOT NULL DEFAULT '{}'::jsonb,         -- config de mapeamento payload → métricas
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_received_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_sources_slug ON integration_sources(slug) WHERE is_active = true;

-- integration_events: log bruto de tudo que chega
CREATE TABLE integration_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  mentoria_id UUID REFERENCES mentorias(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  status integration_event_status NOT NULL DEFAULT 'pending',
  source_event_id TEXT,                               -- id do evento no sistema origem (dedup)
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_events_source ON integration_events(source_id, received_at DESC);
CREATE INDEX idx_integration_events_pending ON integration_events(status) WHERE status = 'pending';
CREATE UNIQUE INDEX idx_integration_events_dedup ON integration_events(source_id, source_event_id) WHERE source_event_id IS NOT NULL;
```

---

## 8. 006_goals_audit.sql

```sql
-- goals: metas por mês × motor OU mentoria
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope_type goal_scope_type NOT NULL,
  motor_id UUID REFERENCES motors(id) ON DELETE CASCADE,
  mentoria_id UUID REFERENCES mentorias(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,                           -- 'faturamento', 'base', 'investimento_trafego'
  target_value NUMERIC(14, 2) NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT goal_scope_check CHECK (
    (scope_type = 'motor' AND motor_id IS NOT NULL AND mentoria_id IS NULL) OR
    (scope_type = 'mentoria' AND mentoria_id IS NOT NULL AND motor_id IS NULL)
  )
);

CREATE UNIQUE INDEX idx_goals_motor_period ON goals(motor_id, metric_key, period_year, period_month)
  WHERE scope_type = 'motor' AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_goals_mentoria_period ON goals(mentoria_id, metric_key, period_year, period_month)
  WHERE scope_type = 'mentoria' AND deleted_at IS NULL;

-- audit_logs: log de mudanças críticas
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                               -- 'create', 'update', 'delete', 'role_change'
  entity_type TEXT NOT NULL,                          -- 'mentoria', 'funnel_template', 'user_profile'
  entity_id UUID,
  changes JSONB,                                      -- { before: {...}, after: {...} }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
```

---

## 9. 007_rls_policies.sql

```sql
-- helper function: extrai role do usuário logado
CREATE OR REPLACE FUNCTION current_user_role() RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid() AND is_active = true
$$;

CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT current_user_role() = 'admin' $$;

CREATE OR REPLACE FUNCTION has_role(roles user_role[]) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT current_user_role() = ANY(roles) $$;

-- Enable RLS em todas as tabelas
ALTER TABLE user_profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE motors                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE motor_dashboard_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics               ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analyses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorias                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentoria_metrics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_template_fields     ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnels                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_metric_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                 ENABLE ROW LEVEL SECURITY;

-- user_profiles: usuário lê o próprio; admin lê/edita tudo
CREATE POLICY "profiles_self_read" ON user_profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_self_update" ON user_profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "profiles_admin_all" ON user_profiles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- motors: todos autenticados leem ativos; admin full
CREATE POLICY "motors_read_active" ON motors FOR SELECT USING (is_active = true AND deleted_at IS NULL OR is_admin());
CREATE POLICY "motors_admin_write" ON motors FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- social_profiles: autenticados leem; admin/infra escrevem
CREATE POLICY "social_profiles_read" ON social_profiles FOR SELECT USING (deleted_at IS NULL OR is_admin());
CREATE POLICY "social_profiles_write" ON social_profiles FOR ALL USING (has_role(ARRAY['admin', 'gestor_infra']::user_role[])) WITH CHECK (has_role(ARRAY['admin', 'gestor_infra']::user_role[]));

-- motor_dashboard_cards: leitura todos, escrita admin
CREATE POLICY "dashboard_cards_read" ON motor_dashboard_cards FOR SELECT USING (true);
CREATE POLICY "dashboard_cards_admin" ON motor_dashboard_cards FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- posts: autenticados leem; admin/trafego escrevem
CREATE POLICY "posts_read" ON posts FOR SELECT USING (deleted_at IS NULL OR is_admin());
CREATE POLICY "posts_write" ON posts FOR ALL USING (has_role(ARRAY['admin', 'gestor_trafego']::user_role[])) WITH CHECK (has_role(ARRAY['admin', 'gestor_trafego']::user_role[]));

-- post_metrics: leitura todos, escrita admin/trafego
CREATE POLICY "post_metrics_read" ON post_metrics FOR SELECT USING (true);
CREATE POLICY "post_metrics_write" ON post_metrics FOR INSERT WITH CHECK (has_role(ARRAY['admin', 'gestor_trafego']::user_role[]));

-- post_analyses: admin/trafego/copy podem criar, todos leem
CREATE POLICY "post_analyses_read" ON post_analyses FOR SELECT USING (true);
CREATE POLICY "post_analyses_write" ON post_analyses FOR INSERT WITH CHECK (has_role(ARRAY['admin', 'gestor_trafego', 'copy']::user_role[]));
CREATE POLICY "post_analyses_delete" ON post_analyses FOR DELETE USING (is_admin() OR created_by = auth.uid());

-- tasks: todos leem e escrevem (kanban colaborativo)
CREATE POLICY "tasks_authenticated" ON tasks FOR ALL USING (auth.uid() IS NOT NULL AND deleted_at IS NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tasks_admin_all" ON tasks FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- task_comments: todos leem e escrevem
CREATE POLICY "task_comments_authenticated" ON task_comments FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- mentorias: autenticados leem; admin/trafego escrevem
CREATE POLICY "mentorias_read" ON mentorias FOR SELECT USING (deleted_at IS NULL OR is_admin());
CREATE POLICY "mentorias_write" ON mentorias FOR ALL USING (has_role(ARRAY['admin', 'gestor_trafego']::user_role[])) WITH CHECK (has_role(ARRAY['admin', 'gestor_trafego']::user_role[]));

-- mentoria_metrics: leitura todos, escrita admin/trafego
CREATE POLICY "mentoria_metrics_read" ON mentoria_metrics FOR SELECT USING (true);
CREATE POLICY "mentoria_metrics_write" ON mentoria_metrics FOR INSERT WITH CHECK (has_role(ARRAY['admin', 'gestor_trafego']::user_role[]));

-- funnel_templates: leitura todos, escrita admin/infra
CREATE POLICY "funnel_templates_read" ON funnel_templates FOR SELECT USING (deleted_at IS NULL OR is_admin());
CREATE POLICY "funnel_templates_write" ON funnel_templates FOR ALL USING (has_role(ARRAY['admin', 'gestor_infra']::user_role[])) WITH CHECK (has_role(ARRAY['admin', 'gestor_infra']::user_role[]));

-- funnel_template_fields: leitura todos, escrita admin/infra
CREATE POLICY "funnel_template_fields_read" ON funnel_template_fields FOR SELECT USING (true);
CREATE POLICY "funnel_template_fields_write" ON funnel_template_fields FOR ALL USING (has_role(ARRAY['admin', 'gestor_infra']::user_role[])) WITH CHECK (has_role(ARRAY['admin', 'gestor_infra']::user_role[]));

-- funnels: leitura todos, escrita admin/trafego/infra
CREATE POLICY "funnels_read" ON funnels FOR SELECT USING (deleted_at IS NULL OR is_admin());
CREATE POLICY "funnels_write" ON funnels FOR ALL USING (has_role(ARRAY['admin', 'gestor_trafego', 'gestor_infra']::user_role[])) WITH CHECK (has_role(ARRAY['admin', 'gestor_trafego', 'gestor_infra']::user_role[]));

-- funnel_metric_snapshots: leitura todos, insert por admin/trafego/infra, sem update
CREATE POLICY "funnel_snapshots_read" ON funnel_metric_snapshots FOR SELECT USING (true);
CREATE POLICY "funnel_snapshots_insert" ON funnel_metric_snapshots FOR INSERT WITH CHECK (has_role(ARRAY['admin', 'gestor_trafego', 'gestor_infra']::user_role[]));

-- integration_sources: admin/infra full
CREATE POLICY "integration_sources_read" ON integration_sources FOR SELECT USING (has_role(ARRAY['admin', 'gestor_infra']::user_role[]));
CREATE POLICY "integration_sources_write" ON integration_sources FOR ALL USING (has_role(ARRAY['admin', 'gestor_infra']::user_role[])) WITH CHECK (has_role(ARRAY['admin', 'gestor_infra']::user_role[]));

-- integration_events: admin/infra leem; insert feito via service_role (webhook)
CREATE POLICY "integration_events_read" ON integration_events FOR SELECT USING (has_role(ARRAY['admin', 'gestor_infra']::user_role[]));

-- goals: autenticados leem, admin escreve
CREATE POLICY "goals_read" ON goals FOR SELECT USING (deleted_at IS NULL OR is_admin());
CREATE POLICY "goals_admin" ON goals FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- audit_logs: admin leem
CREATE POLICY "audit_logs_admin_read" ON audit_logs FOR SELECT USING (is_admin());
```

---

## 10. 008_triggers.sql

```sql
-- updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER t_user_profiles_updated       BEFORE UPDATE ON user_profiles              FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_motors_updated              BEFORE UPDATE ON motors                     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_social_profiles_updated     BEFORE UPDATE ON social_profiles            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_dashboard_cards_updated     BEFORE UPDATE ON motor_dashboard_cards      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_posts_updated               BEFORE UPDATE ON posts                      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_tasks_updated               BEFORE UPDATE ON tasks                      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_mentorias_updated           BEFORE UPDATE ON mentorias                  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_funnel_templates_updated    BEFORE UPDATE ON funnel_templates           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_funnel_template_fields_updated BEFORE UPDATE ON funnel_template_fields  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_funnels_updated             BEFORE UPDATE ON funnels                    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_integration_sources_updated BEFORE UPDATE ON integration_sources        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_goals_updated               BEFORE UPDATE ON goals                      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-criar user_profile quando auth.users é inserido
-- (role default = 'copy', atualizada via invite de admin)
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'copy')
  );
  RETURN NEW;
END $$;

CREATE TRIGGER t_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 11. 009_views.sql

```sql
-- Última snapshot de cada post
CREATE OR REPLACE VIEW v_posts_current AS
SELECT DISTINCT ON (p.id)
  p.*,
  pm.investment,
  pm.followers_gained,
  pm.cost_per_follower,
  pm.likes,
  pm.comments,
  pm.shares,
  pm.reach,
  pm.captured_at AS last_metric_at
FROM posts p
LEFT JOIN LATERAL (
  SELECT * FROM post_metrics WHERE post_id = p.id ORDER BY captured_at DESC LIMIT 1
) pm ON true
WHERE p.deleted_at IS NULL;

-- Última snapshot de cada mentoria
CREATE OR REPLACE VIEW v_mentorias_current AS
SELECT DISTINCT ON (m.id)
  m.*,
  mm.leads_grupo,
  mm.leads_ao_vivo,
  mm.agendamentos,
  mm.calls_realizadas,
  mm.vendas,
  mm.valor_vendas,
  mm.valor_entrada,
  mm.investimento_trafego,
  mm.investimento_api,
  (mm.investimento_trafego + mm.investimento_api) AS investimento_total,
  mm.captured_at AS last_metric_at,
  -- cálculos derivados (percentuais exibidos nos cards)
  CASE WHEN mm.leads_grupo > 0 THEN ROUND((mm.leads_ao_vivo::numeric / mm.leads_grupo) * 100, 1) ELSE 0 END AS pct_comparecimento,
  CASE WHEN mm.leads_ao_vivo > 0 THEN ROUND((mm.agendamentos::numeric / mm.leads_ao_vivo) * 100, 1) ELSE 0 END AS pct_agendamento,
  CASE WHEN mm.agendamentos > 0 THEN ROUND((mm.calls_realizadas::numeric / mm.agendamentos) * 100, 1) ELSE 0 END AS pct_comparecimento_call,
  CASE WHEN mm.calls_realizadas > 0 THEN ROUND((mm.vendas::numeric / mm.calls_realizadas) * 100, 1) ELSE 0 END AS pct_conversao_call,
  (mm.captured_at IS NULL) AS sem_debriefing
FROM mentorias m
LEFT JOIN LATERAL (
  SELECT * FROM mentoria_metrics WHERE mentoria_id = m.id ORDER BY captured_at DESC LIMIT 1
) mm ON true
WHERE m.deleted_at IS NULL;

-- Último valor de cada campo de cada funil
CREATE OR REPLACE VIEW v_funnels_current_values AS
SELECT DISTINCT ON (fs.funnel_id, fs.field_key)
  fs.funnel_id,
  fs.field_key,
  fs.value_numeric,
  fs.value_text,
  fs.source,
  fs.captured_at
FROM funnel_metric_snapshots fs
ORDER BY fs.funnel_id, fs.field_key, fs.captured_at DESC;
```

---

## 12. 010_seed.sql

```sql
-- Motores default
INSERT INTO motors (slug, name, description, icon, display_order, is_active) VALUES
  ('mentorias', 'Mentorias', 'Eventos ao vivo high-ticket com funil de conversão', 'GraduationCap', 1, true),
  ('social-selling', 'Social Selling', 'Impulsionamento pago de conteúdo orgânico', 'Megaphone', 2, true)
ON CONFLICT (slug) DO NOTHING;

-- Social profiles seed
INSERT INTO social_profiles (motor_id, slug, name, instagram_handle, is_active)
SELECT id, 'cleiton', 'Cleiton Querobin', '@cleitonquerobin', true FROM motors WHERE slug = 'social-selling'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO social_profiles (motor_id, slug, name, instagram_handle, is_active)
SELECT id, 'julia', 'Julia Ottoni', '@juliaottoni', true FROM motors WHERE slug = 'social-selling'
ON CONFLICT (slug) DO NOTHING;

-- Dashboard cards default (motor Mentorias)
INSERT INTO motor_dashboard_cards (motor_id, card_key, label, display_order, config)
SELECT id, 'mentorias_ativas', 'Mentorias Ativas', 1, '{"format": "integer"}'::jsonb FROM motors WHERE slug = 'mentorias'
ON CONFLICT DO NOTHING;

INSERT INTO motor_dashboard_cards (motor_id, card_key, label, display_order, config)
SELECT id, 'investimento_total', 'Investimento Total', 2, '{"format": "currency"}'::jsonb FROM motors WHERE slug = 'mentorias'
ON CONFLICT DO NOTHING;

INSERT INTO motor_dashboard_cards (motor_id, card_key, label, display_order, config)
SELECT id, 'faturamento_total', 'Faturamento Total', 3, '{"format": "currency"}'::jsonb FROM motors WHERE slug = 'mentorias'
ON CONFLICT DO NOTHING;

INSERT INTO motor_dashboard_cards (motor_id, card_key, label, display_order, config)
SELECT id, 'base_total', 'Base Total', 4, '{"format": "integer"}'::jsonb FROM motors WHERE slug = 'mentorias'
ON CONFLICT DO NOTHING;

INSERT INTO motor_dashboard_cards (motor_id, card_key, label, display_order, config)
SELECT id, 'captacao_trafego_total', 'Captação Tráfego Total', 5, '{"format": "integer"}'::jsonb FROM motors WHERE slug = 'mentorias'
ON CONFLICT DO NOTHING;

-- Dashboard cards default (motor Social Selling)
INSERT INTO motor_dashboard_cards (motor_id, card_key, label, display_order, config)
SELECT id, 'valor_investido', 'Valor Investido', 1, '{"format": "currency"}'::jsonb FROM motors WHERE slug = 'social-selling'
ON CONFLICT DO NOTHING;

INSERT INTO motor_dashboard_cards (motor_id, card_key, label, display_order, config)
SELECT id, 'custo_medio_seguidor', 'Custo Médio por Seguidor', 2, '{"format": "currency"}'::jsonb FROM motors WHERE slug = 'social-selling'
ON CONFLICT DO NOTHING;

INSERT INTO motor_dashboard_cards (motor_id, card_key, label, display_order, config)
SELECT id, 'total_criativos', 'Total de Criativos Impulsionados', 3, '{"format": "integer"}'::jsonb FROM motors WHERE slug = 'social-selling'
ON CONFLICT DO NOTHING;

INSERT INTO motor_dashboard_cards (motor_id, card_key, label, display_order, config)
SELECT id, 'total_seguidores', 'Total de Seguidores Gerados', 4, '{"format": "integer"}'::jsonb FROM motors WHERE slug = 'social-selling'
ON CONFLICT DO NOTHING;

-- Funnel template default (11 campos conforme especificado)
WITH new_template AS (
  INSERT INTO funnel_templates (name, description, is_default)
  VALUES ('Funil Padrão de Mentoria', 'Template base com os 11 indicadores de funil de mentoria Bethel', true)
  RETURNING id
)
INSERT INTO funnel_template_fields (template_id, field_key, label, field_type, display_order, is_required, is_aggregable, default_source)
SELECT id, k, l, t::field_type, o, r, a, s::metric_source FROM new_template, (VALUES
  ('leads',           'Leads do Funil',      'number',     1,  true,  true,  'manual'),
  ('list_url',        'Link da Lista',       'url',        2,  false, false, 'manual'),
  ('qualificados',    'Qualificados',        'number',     3,  false, true,  'manual'),
  ('ativados',        'Ativados',            'number',     4,  false, true,  'manual'),
  ('no_grupo',        'No Grupo',            'number',     5,  false, true,  'manual'),
  ('ao_vivo',         'Ao Vivo',             'number',     6,  false, true,  'manual'),
  ('agendados',       'Agendados',           'number',     7,  false, true,  'manual'),
  ('calls_realizadas','Calls Realizadas',    'number',     8,  false, true,  'manual'),
  ('vendas',          'Vendas',              'number',     9,  false, true,  'manual'),
  ('valor_venda',     'Valor em Venda',      'currency',   10, false, true,  'manual'),
  ('valor_entrada',   'Valor de Entrada',    'currency',   11, false, true,  'manual')
) AS v(k, l, t, o, r, a, s);

-- Fonte de integração Fluxon (seed, secret gerado depois na UI)
INSERT INTO integration_sources (slug, name, type, is_active, config, mapping)
VALUES (
  'fluxon',
  'Fluxon — WhatsApp API Oficial',
  'fluxon',
  true,
  '{"note": "Configurar webhook_secret_hash via UI de settings/integrations"}'::jsonb,
  '{"fields": [{"source_path": "event.cost", "target_field": "investimento_api", "target_table": "mentoria_metrics"}, {"source_path": "event.volume", "target_field": "leads_grupo", "target_table": "mentoria_metrics"}]}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
```

---

## 13. Storage buckets

Executar no Supabase Dashboard → Storage:

```sql
-- Bucket para análises de posts (TXT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES (
  'post-analyses',
  'post-analyses',
  false,
  5242880,                              -- 5MB
  ARRAY['text/plain']
) ON CONFLICT DO NOTHING;

-- RLS do bucket
CREATE POLICY "post_analyses_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'post-analyses' AND auth.uid() IS NOT NULL
);
CREATE POLICY "post_analyses_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'post-analyses' AND auth.uid() IS NOT NULL
);
CREATE POLICY "post_analyses_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'post-analyses' AND (owner = auth.uid() OR is_admin())
);

-- Bucket para avatars (social_profiles + user_profiles)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES (
  'avatars',
  'avatars',
  true,                                 -- público para facilitar <Image> externo
  2097152,                              -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT DO NOTHING;

CREATE POLICY "avatars_read_public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_write_admin" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND is_admin()
);
```

---

## 14. Notas importantes

- **Soft delete** em `motors`, `social_profiles`, `posts`, `tasks`, `mentorias`, `funnel_templates`, `funnels`, `goals` (coluna `deleted_at`). Snapshots (`post_metrics`, `mentoria_metrics`, `funnel_metric_snapshots`) não são softdeletados — são append-only.
- **`cost_per_follower`** em `post_metrics` é **GENERATED COLUMN** — calculado pelo Postgres.
- **`field_key` em `funnel_metric_snapshots`** é TEXT deliberadamente (sem FK) para sobreviver a mudanças no template.
- **`goals`** usa CHECK constraint com XOR para garantir que apenas `motor_id` OU `mentoria_id` seja preenchido.
- **RLS em `funnel_metric_snapshots`** permite INSERT mas não UPDATE — snapshots são imutáveis por design.
- **`handle_new_user()`** cria `user_profiles` automaticamente quando `auth.users` recebe insert (via magic link).
