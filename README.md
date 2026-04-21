# Bethel Motores

Plataforma modular interna de motores de crescimento da Bethel Systems. Cada
motor é uma frente de aquisição (Mentorias, Social Selling, …) com módulos e
métricas próprias.

## Stack

Next.js 14 (App Router) · TypeScript strict · Supabase (Postgres + RLS + Auth)
· Tailwind · shadcn/ui · TanStack Query 5 · Zustand · React Hook Form + Zod ·
`@supabase/ssr` · Recharts · @dnd-kit

## Estrutura (compacta)

```
src/
├── app/
│   ├── (auth)/login, callback
│   ├── (dashboard)/motors, settings, layout.tsx
│   └── api/[domínio]/route.ts
├── components/
│   ├── ui/                    shadcn (copiado)
│   ├── layout/                sidebar, header, breadcrumbs, ProtectedRoute
│   ├── motors, mentorias, social-selling, dashboard,
│   └── settings, users, goals, integrations, shared/
├── hooks/                     useUser, useMentorias, useFunnels, useTasks …
├── lib/
│   ├── supabase/              client, server, admin, middleware
│   ├── validators/            zod schemas isomórficos
│   ├── utils/                 format, calc, date-range
│   ├── auth/                  roles, guard
│   └── integrations/          webhook-router, fluxon-adapter, meta-ads
├── services/                  lógica de negócio (*.service.ts)
├── stores/                    zustand (uiStore, periodStore)
├── types/                     domain types
└── middleware.ts              auth refresh + role gating
```

## Comandos

```bash
npm run dev          # localhost:3000
npm run build        # build de produção (rodar ao final de cada task)
npm run lint         # eslint
npm run lint:strict  # eslint --max-warnings 0
npm run typecheck    # tsc --noEmit
```

## Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

SUPABASE_SERVICE_ROLE_KEY=      # APENAS em src/app/api/*
SUPABASE_JWT_SECRET=
WEBHOOK_SECRET_FLUXON=
META_ADS_ACCESS_TOKEN=          # Fase 2
META_ADS_ACCOUNT_ID=            # Fase 2
```

`service_role` nunca entra no bundle do client — ESLint impede o import de
`@/lib/supabase/admin` fora de `src/app/api/**`.

## Supabase

Migrations ficam em `supabase/migrations/NNN_*.sql` e são aplicadas
manualmente pelo SQL Editor do Dashboard, nesta ordem:

```
001_extensions_enums        006_goals_audit
002_core_tables             007_rls_policies
003_social_selling          008_triggers
004_mentorias_funnels       009_views
005_integrations            010_seed
```

## Autenticação & Autorização

- Supabase Auth magic link (`@supabase/ssr`) — sem senhas
- Middleware refresca cookies a cada request e faz role gating para
  `/settings/users`, `/settings/goals`, `/settings/audit` (admin),
  `/settings/integrations` e `/settings/funnel-templates` (admin/infra)
- Role enforcement em 3 camadas: middleware → RLS no Postgres → `assertRole()`
  em route handlers

## Webhooks

`POST /api/webhooks/[slug]` valida header `x-webhook-secret` com bcrypt,
grava o evento cru em `integration_events`, aplica o `mapping` JSONB da
fonte e registra snapshots em `mentoria_metrics` ou
`funnel_metric_snapshots`. Eventos duplicados (mesmo `source_event_id`)
retornam 200 sem reprocessar.

## Checklist pré-deploy (docs/security.md §9)

- [x] Zero `any` em TypeScript (`rg '\bany\b' src/ --type ts`)
- [x] Zero `console.log` (`rg 'console\\.log' src/`)
- [x] Todos route handlers com try/catch + `console.error("[ROTA]", …)`
- [x] Validação Zod em toda mutation server-side
- [x] `.env.local` no `.gitignore`; template em `.env.local.example`
- [x] ESLint bloqueia import de `@/lib/supabase/admin` fora de
      `src/app/api/`
- [x] Middleware protege rotas admin/infra
- [x] Security headers aplicados em `next.config.mjs`
      (X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy)
- [x] `robots.txt` com `Disallow: /` (app interno)
- [ ] Rate limiting em `/login` e `/api/webhooks/*` (Fase 3 — Upstash Redis)
- [x] Upload de análises restrito a `text/plain` ≤ 5MB (`post-analyses`
      bucket + validação dupla no client)
- [x] Toda tabela sensível tem RLS ativo (checar migration
      `007_rls_policies.sql`)
- [x] Mutations críticas (goals, user roles) gravam em `audit_logs`

## Docs

- `docs/briefing.md` — contexto e decisões
- `docs/PRD.md` — requisitos, features, user stories
- `docs/tech-stack.md` — escolhas de pacote + ADRs
- `docs/architecture.md` — estrutura de pastas e padrões
- `docs/schema.md` — SQL, enums, RLS, views, seed
- `docs/security.md` — auth, permissões, validação
- `docs/ux-flows.md` — fluxos de tela e padrões de interação
- `docs/TASKS.md` — backlog sequencial

## Fluxo de task

1. Abrir `docs/TASKS.md` e localizar a task
2. Ler os docs referenciados em **LER**
3. Listar arquivos de CRIAR/EDITAR e respeitar **NÃO TOCAR**
4. Escrever seguindo padrões dos arquivos LER
5. `npm run build` deve passar ao final
6. Commit + push na branch da feature
