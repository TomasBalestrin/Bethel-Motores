> 🐜 Homem-Formiga | 21/04/2026 | v1.0

# TASKS — Bethel Motores

Cada task é uma sessão do Claude Code (≤ 6 arquivos CRIAR). Ordem de execução obrigatória. Ao final de cada task rodar `npm run build` e retornar ✅/⚠️/❌ com descrição.

**Recorte de fases:**
- **Fase 1 (Mentorias)** = Blocos A + B + C + D
- **Fase 2 (Social Selling)** = Bloco E
- **Fase 3 (Polish)** = Bloco F

---

## Bloco A — Setup

### A1 ⬜ 🟢 Inicializar projeto Next.js
**CRIAR:** projeto via `create-next-app`
**EDITAR:** `tsconfig.json` (alias `@/`, `noUncheckedIndexedAccess`), `package.json` (scripts), `.gitignore`
**LER:** `docs/tech-stack.md` (seções Core Stack + Pacotes Extras), `CLAUDE.md`
**NÃO TOCAR:** N/A

Steps:
1. `npx create-next-app@latest bethel-motores --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
2. Ajustar `tsconfig.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`
3. Instalar deps: `npm i @supabase/ssr @supabase/supabase-js zustand @tanstack/react-query react-hook-form zod @hookform/resolvers framer-motion lucide-react date-fns recharts sonner next-safe-action @dnd-kit/core @dnd-kit/sortable bcryptjs`
4. Dev deps: `npm i -D @types/bcryptjs`
5. Adicionar scripts: `"typecheck": "tsc --noEmit"`, `"lint:strict": "eslint --max-warnings 0 ."`
6. `.gitignore` — confirmar `.env.local`, `.env*.local`
7. `npm run build`

**Critério:** ✅ Build passou com dependências instaladas, alias `@/` funcionando, tsconfig strict.

---

### A2 ⬜ 🟡 Configurar Tailwind + shadcn + design system
**CRIAR:** componentes base shadcn (`button`, `input`, `label`, `card`, `dialog`, `drawer`, `dropdown-menu`, `select`, `toast` via sonner, `alert-dialog`, `tabs`, `badge`, `progress`, `skeleton`, `table`, `separator`, `tooltip`, `switch`, `checkbox`, `avatar`)
**EDITAR:** `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `components.json` (shadcn)
**LER:** design system do repo Bethel (HTML/MD se presente), `docs/tech-stack.md` (Responsividade + Fontes), `docs/architecture.md` (Nomenclatura)
**NÃO TOCAR:** `tsconfig.json`, `package.json`, arquivos da A1 que não sejam os listados

Steps:
1. `npx shadcn@latest init` — escolher Default, CSS variables yes, pasta `src/components/ui`
2. `npx shadcn@latest add button input label card dialog drawer dropdown-menu select alert-dialog tabs badge progress skeleton table separator tooltip switch checkbox avatar`
3. Instalar sonner: `npx shadcn@latest add sonner`
4. Configurar fontes via `next/font` em `src/app/layout.tsx`: Plus Jakarta Sans (variável `--font-jakarta`, headings) + Inter (`--font-inter`, body)
5. CSS variables em `globals.css`: cores primária/acento do design system Bethel (primary `#1A5CE6`, accent `#F2762E`, surface, muted, border, destructive, success, warning) — light e dark
6. `tailwind.config.ts`: mapear CSS vars para `theme.extend.colors`, adicionar `fontFamily` com variables

**Critério:** ✅ shadcn funciona com tema custom, fontes carregam, `<Button>` renderiza com cor primária.

---

### A3 ⬜ 🟢 Configurar Supabase clients + middleware
**CRIAR:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`, `.env.local.example`
**EDITAR:** `.gitignore` (garantir `.env*.local`), `.eslintrc.json` (regra `no-restricted-imports` para `admin.ts`)
**LER:** `docs/security.md` (seções 1 e 5), `docs/architecture.md` (seção 5 — Supabase)
**NÃO TOCAR:** arquivos da A1/A2 além dos listados

Steps:
1. Ler `docs/security.md` §1 (Auth) e §5 (Env vars)
2. Criar `client.ts` com `createBrowserClient` do `@supabase/ssr`
3. Criar `server.ts` com `createServerClient` + `cookies()` do Next
4. Criar `admin.ts` com `createClient` do `@supabase/supabase-js` usando `SUPABASE_SERVICE_ROLE_KEY`, sem persist session
5. Criar `middleware.ts` em `src/lib/supabase/` com função `updateSession(request)` que refresca cookie e retorna `NextResponse`
6. Criar `src/middleware.ts` que usa `updateSession` + matcher excluindo static assets e webhooks
7. `.env.local.example`: todas as envs comentadas (sem valores)
8. ESLint rule `no-restricted-imports` para `@/lib/supabase/admin` com override permitindo em `src/app/api/**`

**Critério:** ✅ Build ok, middleware compila, import de `admin.ts` fora de `/api` gera erro de lint.

---

### A4 ⬜ 🟡 ⚙️ MANUAL — Aplicar schema no Supabase
**CRIAR:** arquivos em `supabase/migrations/` copiando de `docs/schema.md` (001 a 010)
**LER:** `docs/schema.md` inteiro
**NÃO TOCAR:** qualquer coisa fora de `supabase/migrations/`

Steps manuais (usuário faz, não Claude Code):
1. Criar projeto no Supabase Dashboard (`bethel-motores-dev`)
2. Copiar URL e ANON_KEY para `.env.local`
3. Copiar SERVICE_ROLE_KEY para `.env.local`
4. Abrir SQL Editor no Dashboard
5. Executar em ordem: `001_extensions_enums.sql` → `002_core_tables.sql` → `003_social_selling.sql` → `004_mentorias_funnels.sql` → `005_integrations.sql` → `006_goals_audit.sql` → `007_rls_policies.sql` → `008_triggers.sql` → `009_views.sql` → `010_seed.sql`
6. Executar SQL de Storage buckets (seção 13 de schema.md)
7. Verificar RLS ativo: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity;` deve retornar vazio
8. Gerar tipos: `npx supabase gen types typescript --project-id [id] > src/types/database.ts` (ou copiar do Dashboard → API docs)

**Critério:** ✅ Todas as tabelas criadas, RLS ativo em todas, seed populou 2 motores + 2 profiles + 1 template default + 1 integration source Fluxon, buckets de Storage criados.

---

## Bloco B — Auth

### B1 ⬜ 🟡 Login page + auth callback
**CRIAR:** `src/app/(auth)/login/page.tsx`, `src/app/(auth)/login/LoginForm.tsx`, `src/app/auth/callback/route.ts`, `src/app/(auth)/layout.tsx`, `src/lib/validators/auth.ts`
**EDITAR:** `src/app/layout.tsx` (incluir `<Toaster />` do sonner no root)
**LER:** `docs/security.md` §1, `docs/ux-flows.md` §3 (Auth Flow), `src/lib/supabase/client.ts`, `src/components/ui/button.tsx`
**NÃO TOCAR:** middleware, arquivos de setup

Steps:
1. Validator Zod: `emailSchema = z.string().email().max(255)`
2. `(auth)/layout.tsx`: layout minimalista centralizado, fundo neutro, sem sidebar
3. `login/page.tsx`: Server Component que renderiza `<LoginForm />`
4. `LoginForm.tsx` (`"use client"`): RHF + zodResolver, `signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` }})`, toast success/error, estados loading/success/error
5. `auth/callback/route.ts`: GET que lê `?code`, chama `exchangeCodeForSession(code)`, redirect `/motors` (sucesso) ou `/login?error=invalid_link` (erro)
6. Root layout: incluir `<Toaster richColors position="top-right" />` do sonner

**Critério:** ✅ Build ok, `/login` renderiza form, submit envia OTP (testar manualmente com email real após A4).

---

### B2 ⬜ 🟡 Middleware de proteção + role gating
**CRIAR:** `src/lib/auth/roles.ts`, `src/lib/auth/guard.ts`
**EDITAR:** `src/lib/supabase/middleware.ts` (adicionar role gating para rotas sensíveis), `src/middleware.ts`
**LER:** `docs/security.md` §2 (3 camadas), `src/lib/supabase/server.ts`, `src/types/database.ts`
**NÃO TOCAR:** clients Supabase, login page

Steps:
1. `roles.ts`: enum `UserRole`, constante `ROLE_HIERARCHY`, constantes `ADMIN_ROUTES`, `INFRA_ROUTES`, `ADMIN_OR_INFRA_ROUTES`
2. `guard.ts`: função `assertRole(supabase, userId, allowedRoles): Promise<{ok, error?}>` — busca `user_profiles.role` e valida `is_active`
3. `middleware.ts` (`supabase/`): após `getUser()`, se autenticado, buscar profile e aplicar role gating usando os constants de `roles.ts`
4. Lógica:
   - Sem sessão + rota privada → redirect `/login`
   - Com sessão + `/login` → redirect `/motors`
   - Com sessão + rota admin-only + não-admin → redirect `/motors`
   - Com sessão + rota infra-or-admin + role não-permitida → redirect `/motors`

**Critério:** ✅ Build ok, test manual: rota `/settings/users` redireciona para `/motors` se logado como `copy`.

---

### B3 ⬜ 🟢 Hook useUser + invite helper base
**CRIAR:** `src/hooks/useUser.ts`, `src/services/users.service.ts`
**EDITAR:** —
**LER:** `docs/architecture.md` (seção 6 — Data Fetching), `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts` — só para ler padrão
**NÃO TOCAR:** middleware, clients Supabase

Steps:
1. `useUser.ts`: TanStack Query que busca user autenticado + `user_profiles` relacionado via join
2. `users.service.ts`: funções `listUsers(supabase)`, `getUserProfile(supabase, userId)`, `inviteUser(admin, email, role)` (usa admin client + `admin.auth.admin.inviteUserByEmail`), `updateUserRole(supabase, userId, role)`, `deactivateUser(supabase, userId)`

**Critério:** ✅ Build ok, `useUser()` retorna `{ user, profile, isLoading }`.

---

## Bloco C — Layout

### C1 ⬜ 🟡 AppSidebar + AppHeader + Breadcrumbs
**CRIAR:** `src/components/layout/AppSidebar.tsx`, `src/components/layout/AppHeader.tsx`, `src/components/layout/Breadcrumbs.tsx`, `src/components/layout/SidebarNavItem.tsx`, `src/stores/uiStore.ts`
**EDITAR:** —
**LER:** `docs/ux-flows.md` §2 (Navegação), `docs/architecture.md` §1 (estrutura), `src/components/ui/avatar.tsx`, `src/hooks/useUser.ts`
**NÃO TOCAR:** arquivos de auth, setup

Steps:
1. `uiStore.ts`: Zustand com `{ sidebarCollapsed: boolean, toggleSidebar() }`, persist em cookie
2. `AppSidebar.tsx`: nav items conforme ux-flows §2.1, role-aware (some itens só para admin/infra), estado collapsed, ícones Lucide
3. `AppHeader.tsx`: breadcrumbs à esquerda, avatar dropdown à direita (logout + profile), altura 56px
4. `Breadcrumbs.tsx`: gera a partir do pathname atual, segmentos clicáveis
5. `SidebarNavItem.tsx`: ativo baseado em `usePathname()`, estado hover/active, ícone + label

**Critério:** ✅ Sidebar renderiza, collapse funciona, ativo destacado.

---

### C2 ⬜ 🟡 Dashboard layout + ProtectedRoute
**CRIAR:** `src/app/(dashboard)/layout.tsx`, `src/components/layout/ProtectedRoute.tsx`, `src/app/(dashboard)/error.tsx`, `src/app/(dashboard)/not-found.tsx`
**EDITAR:** —
**LER:** `src/components/layout/AppSidebar.tsx`, `src/components/layout/AppHeader.tsx`
**NÃO TOCAR:** middleware, login, sidebar

Steps:
1. `(dashboard)/layout.tsx`: Server Component que valida sessão via `createClient` server, carrega user profile, renderiza sidebar + header + `<main>`
2. `ProtectedRoute.tsx`: wrapper client que aceita `allowedRoles`, redireciona se não compatível
3. `error.tsx`: boundary com botão "Tentar novamente"
4. `not-found.tsx`: 404 elegante com link para `/motors`

**Critério:** ✅ Acessar `/motors` sem login redireciona `/login`; layout aparece para logado.

---

### C3 ⬜ 🟢 Home de motores + MotorCard
**CRIAR:** `src/app/(dashboard)/motors/page.tsx`, `src/components/motors/MotorCard.tsx`, `src/components/shared/EmptyState.tsx`, `src/components/shared/LoadingState.tsx`, `src/services/motors.service.ts`, `src/types/motor.ts`
**EDITAR:** —
**LER:** `docs/PRD.md` F1, `docs/ux-flows.md` §5 (F1), `docs/schema.md` seção 4 (motors)
**NÃO TOCAR:** dashboard layout, sidebar

Steps:
1. `types/motor.ts`: `Motor`, `MotorWithStats`
2. `motors.service.ts`: `listActiveMotors(supabase)` com contagem agregada (count de mentorias ativas para motor `mentorias`, count de social_profiles ativos para motor `social-selling`)
3. `motors/page.tsx`: Server Component que chama service, renderiza grid com `<MotorCard />`, fallback Suspense com `<LoadingState />`, empty com `<EmptyState />`
4. `MotorCard.tsx`: card clicável (use `<Link>`), ícone Lucide dinâmico (com `lucide-react/dynamicIconImports`), nome, descrição, contador
5. `EmptyState.tsx`: ícone + título + descrição + CTA opcional
6. `LoadingState.tsx`: skeleton grid

**Critério:** ✅ `/motors` renderiza 2 cards (Mentorias, Social Selling); click leva para rota respectiva.

---

## Bloco D — Features Mentorias (Fase 1)

### D1.1 ⬜ 🟡 Dashboard Motor Mentorias — UI
**CRIAR:** `src/app/(dashboard)/motors/mentorias/page.tsx`, `src/components/dashboard/MetricCard.tsx`, `src/components/dashboard/PeriodFilter.tsx`, `src/components/dashboard/GoalProgress.tsx`, `src/stores/periodStore.ts`, `src/types/common.ts`
**EDITAR:** —
**LER:** `docs/PRD.md` F6, `docs/ux-flows.md` F6, `docs/schema.md` view `v_mentorias_current`, `src/components/shared/LoadingState.tsx`
**NÃO TOCAR:** motors/page.tsx

Steps:
1. `common.ts`: tipos `Period`, `DateRange`
2. `periodStore.ts`: Zustand `{ period: Period, setPeriod }`, persist URL + cookie
3. `PeriodFilter.tsx`: dropdown shadcn com 7d/30d/90d/mês atual/custom (com DateRangePicker)
4. `MetricCard.tsx`: label + valor formatado + delta % + opcional `<GoalProgress />`
5. `GoalProgress.tsx`: barra progresso realizado/meta com texto
6. `motors/mentorias/page.tsx`: Server Component que busca stats agregados do período, renderiza 5 cards + placeholder de gráfico + botões de navegação (Listagem, Comparar)

**Critério:** ✅ Página renderiza com 5 cards em valores zerados (sem data ainda) + filtro de período funciona.

---

### D1.2 ⬜ 🟡 Dashboard Motor Mentorias — Backend
**CRIAR:** `src/app/api/motors/[slug]/stats/route.ts`, `src/services/mentorias.service.ts` (função `getMotorStats`), `src/lib/utils/format.ts`, `src/lib/utils/calc.ts`, `src/lib/utils/date-range.ts`
**EDITAR:** `src/app/(dashboard)/motors/mentorias/page.tsx` (consumir stats via service direto, não via API — é Server Component)
**LER:** `docs/architecture.md` §4 (API pattern), `docs/schema.md` views, `src/lib/supabase/server.ts`
**NÃO TOCAR:** components dashboard

Steps:
1. `format.ts`: `formatCurrency(n)`, `formatPercent(n, 1)`, `formatCompactNumber(n)`, `formatDateBR(d)`, `formatDateTimeBR(d)`
2. `calc.ts`: `calcPercent(num, den, decimals=1)` com fallback zero, `calcDelta(current, previous)`
3. `date-range.ts`: `periodToRange(period)` retorna `{ from, to, previousFrom, previousTo }`
4. `mentorias.service.ts` — função `getMotorStats(supabase, { from, to })`: agrega `v_mentorias_current` filtrando por `scheduled_at`, retorna `{ mentoriasAtivas, investimentoTotal, faturamentoTotal, baseTotal, captacaoTrafegoTotal }` + comparação com período anterior
5. Route handler GET para clients que precisam (webhook ou external)
6. Page consome service direto

**Critério:** ✅ Cards mostram valores reais (0 se sem data), delta calcula, filtro de período atualiza.

---

### D2.1 ⬜ 🔴 Mentorias · Listagem — UI
**CRIAR:** `src/app/(dashboard)/motors/mentorias/listagem/page.tsx`, `src/components/mentorias/MentoriaCard.tsx`, `src/components/mentorias/MentoriaFilters.tsx`, `src/components/mentorias/MentoriaFormModal.tsx`, `src/hooks/useMentorias.ts`, `src/lib/validators/mentoria.ts`
**EDITAR:** —
**LER:** `docs/PRD.md` F7, `docs/ux-flows.md` F7, imagem de referência anexada pelo Bethel (`/mnt/user-data/uploads/1776740135478_image.png`) — detalhes visuais: pills, grid 2x2, 4 barras de progresso coloridas
**NÃO TOCAR:** dashboard global, motors page

Steps:
1. `validators/mentoria.ts`: `mentoriaCreateSchema` (name, scheduled_at, specialist_id, traffic_budget), `mentoriaUpdateSchema`, `mentoriaMetricsSchema`
2. `useMentorias.ts`: TanStack Query `useQuery` com filtros, `useMutation` para create/update
3. `MentoriaCard.tsx`: conforme referência visual — nome, data (ptBR), 2 pills (status âmbar/verde + especialista azul), grid 2x2 métricas, 4 barras progresso coloridas (Comparecimento azul, Agendamento roxo, Comparecimento Call laranja, Conversão Call verde). Se `sem_debriefing=true`, label muda para "(sem debriefing)"
4. `MentoriaFilters.tsx`: busca debounce 300ms, dropdown status, dropdown ordenação
5. `MentoriaFormModal.tsx`: form RHF+Zod, campos datetime-local, select de `social_profiles`
6. `listagem/page.tsx`: Server Component com initial data, filtros via URL searchParams

**Critério:** ✅ Listagem renderiza cards idênticos à referência; modal Nova Mentoria cria registro (após D2.2).

---

### D2.2 ⬜ 🟡 Mentorias · Listagem — Backend
**CRIAR:** `src/app/api/mentorias/route.ts`, `src/app/api/mentorias/[id]/route.ts`, `src/types/mentoria.ts`, `src/services/social-profiles.service.ts`
**EDITAR:** `src/services/mentorias.service.ts` (adicionar `listMentorias`, `createMentoria`, `getMentoriaById`)
**LER:** `docs/PRD.md` §4 (API Routes), `docs/architecture.md` §4, `src/lib/auth/guard.ts`, `src/lib/validators/mentoria.ts`
**NÃO TOCAR:** UI de listagem

Steps:
1. `types/mentoria.ts`: `Mentoria`, `MentoriaWithMetrics` (da view), `MentoriaInput`
2. `social-profiles.service.ts`: `listSocialProfiles(supabase)` para popular select
3. `mentorias.service.ts`: `listMentorias(supabase, { status?, query?, orderBy? })` usando view `v_mentorias_current`; `createMentoria(supabase, input, userId)`; `getMentoriaById(supabase, id)` com funnels relacionados
4. `/api/mentorias/route.ts`: GET (listMentorias) + POST (guard admin/trafego, zod, createMentoria)
5. `/api/mentorias/[id]/route.ts`: GET + PATCH (guard admin/trafego, zod, update status/name/scheduled_at)

**Critério:** ✅ POST cria mentoria, GET retorna com métricas da view, guards bloqueiam role `copy`.

---

### D2.3 ⬜ 🟡 Mentorias · Update Metrics
**CRIAR:** `src/components/mentorias/MentoriaMetricsDrawer.tsx`, `src/app/api/mentorias/[id]/metrics/route.ts`
**EDITAR:** `src/services/mentorias.service.ts` (adicionar `insertMentoriaMetrics`), `src/components/mentorias/MentoriaCard.tsx` (botão "Atualizar" → abre drawer)
**LER:** `docs/ux-flows.md` F8 (drawer detail), `docs/schema.md` `mentoria_metrics` (append-only), `src/components/ui/drawer.tsx`
**NÃO TOCAR:** card layout core

Steps:
1. `MentoriaMetricsDrawer.tsx`: drawer shadcn, form RHF, 9 inputs numéricos, nota explicativa "nova snapshot preserva histórico"
2. `insertMentoriaMetrics`: INSERT em `mentoria_metrics` (NUNCA UPDATE)
3. POST `/api/mentorias/[id]/metrics`: guard admin/trafego, zod, insertMentoriaMetrics, invalida query TanStack no cliente via `onSuccess`

**Critério:** ✅ Drawer abre, submit grava snapshot nova (verificar via select no banco), card atualiza valores sem reload.

---

### D3 ⬜ 🔴 Mentoria · Dashboard interno
**CRIAR:** `src/app/(dashboard)/motors/mentorias/[mentoriaId]/page.tsx`, `src/app/(dashboard)/motors/mentorias/[mentoriaId]/layout.tsx`, `src/components/mentorias/MentoriaHeader.tsx`, `src/components/mentorias/MentoriaMetricsGrid.tsx`, `src/components/mentorias/MentoriaTabs.tsx`
**EDITAR:** —
**LER:** `docs/PRD.md` F8, `docs/ux-flows.md` F8, `src/components/dashboard/MetricCard.tsx`, `src/services/mentorias.service.ts`
**NÃO TOCAR:** listagem, drawer de métricas

Steps:
1. `[mentoriaId]/layout.tsx`: Server Component que fetch mentoria + funnels + métricas (view) e passa via contexto ou props via `Outlet` (Next layout recebe children; usar parallel-fetch e query params)
2. `MentoriaHeader.tsx`: nome, data, pill status, pill especialista, botão Editar (modal reuso de MentoriaFormModal em modo edit)
3. `MentoriaMetricsGrid.tsx`: card grande Investimento Total + 7 cards menores (Leads Grupo, Leads Ao Vivo, Agendamentos, Calls Realizadas, Vendas, Valor Vendas, Valor Entrada) + botão "Atualizar métricas" (reusa drawer da D2.3)
4. `MentoriaTabs.tsx`: tabs Dashboard (current), Tráfego, Disparos — cada aba é uma rota nested

**Critério:** ✅ `/motors/mentorias/[id]` renderiza header + cards + tabs (sem conteúdo de tráfego/disparos ainda).

---

### D4.1 ⬜ 🔴 Funis da mentoria — UI
**CRIAR:** `src/components/mentorias/FunnelSection.tsx`, `src/components/mentorias/FunnelCard.tsx`, `src/components/mentorias/FunnelAddModal.tsx`, `src/components/mentorias/FunnelEditDrawer.tsx`, `src/hooks/useFunnels.ts`, `src/lib/validators/funnel.ts`
**EDITAR:** `src/app/(dashboard)/motors/mentorias/[mentoriaId]/page.tsx` (adicionar `<FunnelSection />`)
**LER:** `docs/PRD.md` F9, `docs/ux-flows.md` F9, `docs/schema.md` `funnel_templates` + `funnels` + `funnel_metric_snapshots`
**NÃO TOCAR:** MetricsGrid, drawer de métricas de mentoria

Steps:
1. `validators/funnel.ts`: `funnelCreateSchema`, `funnelSnapshotSchema` (record<string, number|string>)
2. `useFunnels.ts`: query por mentoria_id retornando funnels + current values (via view `v_funnels_current_values`)
3. `FunnelSection.tsx`: header "Funis" + botão Adicionar + lista de `<FunnelCard />`
4. `FunnelCard.tsx`: expansível, header com nome + template + ícone fonte, grid de campos com label + valor + ícone fonte (manual/webhook/api), botão "Editar indicadores"
5. `FunnelAddModal.tsx`: form com nome, select template, URL lista, toggle funil de tráfego
6. `FunnelEditDrawer.tsx`: form dinâmico baseado nos `funnel_template_fields` do funil; campos com `source != manual` ficam disabled + tooltip

**Critério:** ✅ Lista funis da mentoria, adicionar cria funil com template default, editar cria snapshot novo.

---

### D4.2 ⬜ 🟡 Funis — Backend
**CRIAR:** `src/app/api/mentorias/[id]/funnels/route.ts`, `src/app/api/funnels/[id]/route.ts`, `src/app/api/funnels/[id]/snapshot/route.ts`, `src/app/api/funnels/[id]/history/route.ts`, `src/services/funnels.service.ts`, `src/types/funnel.ts`
**EDITAR:** —
**LER:** `docs/PRD.md` §4, `docs/schema.md` (snapshots append-only, field_key TEXT)
**NÃO TOCAR:** UI de funis

Steps:
1. `types/funnel.ts`: `Funnel`, `FunnelTemplate`, `FunnelTemplateField`, `FunnelCurrentValue`, `FunnelSnapshotInput`
2. `funnels.service.ts`: `listFunnelsByMentoria(supabase, mentoriaId)` (com current values), `createFunnel`, `updateFunnel`, `insertFunnelSnapshot` (bulk insert — um snapshot por campo), `listFieldHistory(funnelId, fieldKey)`
3. Rotas conforme PRD §4 — todas com guard admin/trafego/infra
4. Snapshot endpoint valida que campos com `source != manual` não sejam enviados pelo client

**Critério:** ✅ Criar funil, editar indicadores cria N snapshots (um por campo), histórico retorna snapshots ordenados DESC.

---

### D5 ⬜ 🔴 Settings · Funnel Templates
**CRIAR:** `src/app/(dashboard)/settings/funnel-templates/page.tsx`, `src/app/(dashboard)/settings/funnel-templates/[templateId]/page.tsx`, `src/components/mentorias/FunnelTemplateEditor.tsx`, `src/components/mentorias/FunnelFieldEditor.tsx`, `src/app/api/funnel-templates/route.ts`, `src/app/api/funnel-templates/[id]/route.ts`
**EDITAR:** `src/services/funnels.service.ts` (add `listTemplates`, `createTemplate`, `updateTemplate`, `addTemplateField`, `updateTemplateField`, `deleteTemplateField`)
**LER:** `docs/PRD.md` F9 (templates), `docs/ux-flows.md` F9, `src/lib/validators/funnel.ts`, `docs/schema.md` funnel_template_fields
**NÃO TOCAR:** funis dentro de mentoria

Steps:
1. Página lista templates com count de campos e count de funnels usando
2. Editor de template: dados gerais + lista de campos drag-and-drop (reorder atualiza `display_order`)
3. Field editor modal: key (disabled se editando e tem snapshot), label, type, source default, obrigatório, agregável
4. Warning ao tentar deletar field com snapshot: "N snapshots históricos — campo ficará oculto mas snapshots preservados"
5. Guard admin/infra em todas as rotas

**Critério:** ✅ Admin cria template novo com 3 campos; Infra edita default e adiciona campo; tentativa de role `copy` bloqueada.

---

### D6 ⬜ 🟡 Mentoria · Tráfego
**CRIAR:** `src/app/(dashboard)/motors/mentorias/[mentoriaId]/trafego/page.tsx`, `src/components/mentorias/TrafegoTable.tsx`, `src/components/mentorias/TrafegoInlineForm.tsx`, `src/components/mentorias/TrafegoChart.tsx`, `src/app/api/mentorias/[id]/trafego/route.ts`
**EDITAR:** `src/services/mentorias.service.ts` (add `listTrafegoByMentoria`, `insertTrafegoEntry`)
**LER:** `docs/PRD.md` F10, `docs/ux-flows.md` F10, `src/components/mentorias/MentoriaTabs.tsx`
**NÃO TOCAR:** dashboard, funis

Steps:
1. Page consome layout da mentoria, renderiza total + input rápido + chart + tabela
2. Chart Recharts linha — investimento por dia
3. Inline form: data, valor, funil destino (select dos funis da mentoria) — Enter submete
4. Tabela server-rendered inicial + TanStack Query para refresh

**Critério:** ✅ Aba Tráfego mostra chart + tabela, input rápido adiciona linha.

---

### D7 ⬜ 🟡 Mentoria · Disparos
**CRIAR:** `src/app/(dashboard)/motors/mentorias/[mentoriaId]/disparos/page.tsx`, `src/components/mentorias/DisparosList.tsx`, `src/components/mentorias/DisparoEventDrawer.tsx`, `src/app/api/integrations/events/[id]/reprocess/route.ts`
**EDITAR:** `src/services/mentorias.service.ts` (add `listDisparosByMentoria`), `src/services/integrations.service.ts` (criar com `reprocessEvent`)
**LER:** `docs/PRD.md` F11, `docs/ux-flows.md` F11, `docs/schema.md` integration_events
**NÃO TOCAR:** webhooks (próximas tasks)

Steps:
1. Page: totalizadores + lista de eventos (join com `integration_sources` onde slug=fluxon, filter por `mentoria_id`)
2. DisparoEventDrawer: mostra payload JSON bruto formatado + status + botão reprocessar
3. POST reprocess: guard admin/infra, reseta status para `pending`, chama processor

**Critério:** ✅ Aba Disparos lista eventos (vazia inicialmente); reprocessar em evento com status=error funciona (após D9).

---

### D8.1 ⬜ 🔴 Mentorias · Comparar — UI
**CRIAR:** `src/app/(dashboard)/motors/mentorias/comparar/page.tsx`, `src/components/mentorias/CompareSelector.tsx`, `src/components/mentorias/CompareGrid.tsx`, `src/components/mentorias/CompareDiffTable.tsx`
**EDITAR:** —
**LER:** `docs/PRD.md` F12, `docs/ux-flows.md` F12, `src/components/mentorias/MentoriaCard.tsx`
**NÃO TOCAR:** MentoriaCard

Steps:
1. Page client component com multi-select até 4
2. `CompareSelector.tsx`: combobox shadcn com busca
3. `CompareGrid.tsx`: reutiliza `<MentoriaCard />` em colunas
4. `CompareDiffTable.tsx`: tabela com métricas × mentorias, última coluna = variação % vs base (primeira)
5. Botão "Exportar CSV" (usa `Blob` + download local)

**Critério:** ✅ Selecionar 2 mentorias mostra cards lado a lado + tabela com variação %.

---

### D8.2 ⬜ 🟡 Comparar — Backend
**CRIAR:** `src/app/api/compare/route.ts`
**EDITAR:** `src/services/mentorias.service.ts` (add `compareByIds(supabase, ids: string[])`)
**LER:** `docs/schema.md` view `v_mentorias_current`, `src/lib/validators/mentoria.ts`
**NÃO TOCAR:** UI compare

Steps:
1. Zod schema `compareSchema = z.object({ ids: z.array(z.string().uuid()).min(2).max(4) })`
2. GET `/api/compare?ids=a,b,c`: parse, service, retorna array de `MentoriaWithMetrics` + metadados

**Critério:** ✅ Endpoint retorna 200 com array; request com 1 ou >4 retorna 400.

---

### D9.1 ⬜ 🔴 Webhook genérico + Fluxon
**CRIAR:** `src/app/api/webhooks/[sourceSlug]/route.ts`, `src/lib/integrations/webhook-router.ts`, `src/lib/integrations/fluxon-adapter.ts`, `src/services/integrations.service.ts`, `src/lib/validators/integration.ts`
**EDITAR:** `src/middleware.ts` (confirmar que `/api/webhooks` está excluído do matcher de auth)
**LER:** `docs/PRD.md` F13, `docs/security.md` §4.4 (webhook auth), `docs/schema.md` integrations
**NÃO TOCAR:** UI settings (próxima task)

Steps:
1. `integration.ts`: `mappingSchema` (array de `{ source_path, target_field, target_table }`)
2. `webhook-router.ts`: exporta `processWebhook(payload, source)` que aplica mapping e INSERTa snapshots/metrics
3. `fluxon-adapter.ts`: normaliza payload Fluxon → formato esperado pelo router
4. Route handler: valida secret (bcrypt), salva evento cru em `integration_events`, chama processor, retorna 200 rápido (processamento opcional em background via setTimeout zero para MVP)
5. Deduplicação: se `source_event_id` já existe em `integration_events`, retorna 200 sem reprocessar
6. `integrations.service.ts`: `listSources`, `createSource` (gera secret + salva hash), `updateMapping`, `reprocessEvent`

**Critério:** ✅ POST `/api/webhooks/fluxon` com secret válido salva evento; mapping aplica corretamente em mentoria_metrics.

---

### D9.2 ⬜ 🔴 Settings · Integrations — UI
**CRIAR:** `src/app/(dashboard)/settings/integrations/page.tsx`, `src/app/(dashboard)/settings/integrations/[sourceId]/page.tsx`, `src/components/integrations/SourceCard.tsx`, `src/components/integrations/SourceCreateModal.tsx`, `src/components/integrations/SecretDisplayModal.tsx`, `src/components/integrations/MappingEditor.tsx`
**EDITAR:** `src/services/integrations.service.ts` (add `getSourceWithRecentEvents`)
**LER:** `docs/PRD.md` F13, `docs/ux-flows.md` F13, `src/components/ui/dialog.tsx`
**NÃO TOCAR:** webhook route

Steps:
1. Lista de sources + botão Nova
2. Modal criar: slug, nome, tipo → após criar, `SecretDisplayModal` mostra secret UMA ÚNICA VEZ + botão copiar
3. Detail page: dados + lista de payloads recentes (últimos 10 eventos) + editor de mapping
4. MappingEditor: lista campos do payload detectados dinamicamente + dropdown "Mapear para"
5. Preview live: "Se este payload chegasse, geraria: [...]"

**Critério:** ✅ Admin/Infra cria source; secret mostrado uma vez; mapping editor salva em `integration_sources.mapping`.

---

### D10 ⬜ 🟡 Settings · Metas (Goals)
**CRIAR:** `src/app/(dashboard)/settings/goals/page.tsx`, `src/components/goals/GoalsTable.tsx`, `src/components/goals/GoalCreateModal.tsx`, `src/app/api/goals/route.ts`, `src/services/goals.service.ts`, `src/lib/validators/goal.ts`
**EDITAR:** `src/components/dashboard/MetricCard.tsx` (integrar `<GoalProgress />` quando goal existir)
**LER:** `docs/PRD.md` F14, `docs/ux-flows.md` F14, `docs/schema.md` goals (CHECK constraint)
**NÃO TOCAR:** dashboards principais (só MetricCard)

Steps:
1. `goals.service.ts`: CRUD + `getGoalByScopeAndPeriod(scopeType, scopeId, year, month, metricKey)`
2. Route handler guard admin
3. Modal: scope (radio motor/mentoria), select, metric_key (dropdown com chaves pré-definidas), target_value, month/year
4. Tabela lista com edit inline em target_value
5. MetricCard aceita prop `goal?: Goal` e renderiza `<GoalProgress />`

**Critério:** ✅ Admin cria goal de faturamento no motor Mentorias; dashboard global mostra barra de progresso.

---

### D11 ⬜ 🟡 Settings · Usuários
**CRIAR:** `src/app/(dashboard)/settings/users/page.tsx`, `src/components/users/UsersTable.tsx`, `src/components/users/UserInviteModal.tsx`, `src/components/users/UserRoleInlineEdit.tsx`, `src/app/api/users/route.ts`, `src/app/api/users/invite/route.ts`, `src/app/api/users/[id]/route.ts`
**EDITAR:** `src/services/users.service.ts` (implementar invite completo com `admin.auth.admin.inviteUserByEmail`)
**LER:** `docs/PRD.md` F15, `docs/ux-flows.md` F15, `src/lib/supabase/admin.ts`
**NÃO TOCAR:** middleware, guards

Steps:
1. Guard admin em todas as rotas
2. Invite usa `createAdminClient().auth.admin.inviteUserByEmail(email, { data: { role, name } })`
3. Trigger `handle_new_user` cria `user_profiles` com role do `raw_user_meta_data`
4. UI: tabela + modal convidar + edit inline de role + action "Desativar" com AlertDialog

**Critério:** ✅ Admin convida email; magic link chega; ao clicar, usuário entra com role convidada.

---

### D12 ⬜ 🟢 Redirect raiz `/` → `/motors`
**CRIAR:** `src/app/page.tsx`
**EDITAR:** —
**LER:** `docs/ux-flows.md` §1 (mapa de rotas), `src/lib/supabase/server.ts`
**NÃO TOCAR:** middleware

Steps:
1. Server Component que checa sessão — se logado redirect `/motors`, senão redirect `/login`

**Critério:** ✅ Acessar `/` redireciona corretamente.

---

## Bloco E — Features Social Selling (Fase 2)

### E1.1 ⬜ 🟡 Social Selling · Seleção de perfil
**CRIAR:** `src/app/(dashboard)/motors/social-selling/page.tsx`, `src/components/social-selling/ProfileSelectionCard.tsx`, `src/app/api/social-profiles/route.ts`
**EDITAR:** `src/services/social-profiles.service.ts` (add `listProfilesWithStats`)
**LER:** `docs/PRD.md` F2, `docs/ux-flows.md` F2+F3, `src/components/motors/MotorCard.tsx`
**NÃO TOCAR:** motors home

Steps:
1. listProfilesWithStats retorna profiles + count de posts ativos + total seguidores gerados
2. Page Server Component renderiza grid de `<ProfileSelectionCard />`
3. Card mostra avatar + nome + @handle + "N seguidores no mês"

**Critério:** ✅ Renderiza Cleiton e Julia (seed); click leva a `/motors/social-selling/[slug]`.

---

### E1.2 ⬜ 🔴 Social Selling · Dashboard do perfil
**CRIAR:** `src/app/(dashboard)/motors/social-selling/[profileSlug]/page.tsx`, `src/app/(dashboard)/motors/social-selling/[profileSlug]/layout.tsx`, `src/components/social-selling/ProfileHeader.tsx`, `src/components/social-selling/PostsGrid.tsx`, `src/components/social-selling/PostCardCompact.tsx`, `src/components/social-selling/PostDetailModal.tsx`
**EDITAR:** `src/services/social-profiles.service.ts` (add `getProfileBySlug`, `getProfileDashboardStats`)
**LER:** `docs/PRD.md` F3, `docs/ux-flows.md` F2+F3, `docs/schema.md` view `v_posts_current`
**NÃO TOCAR:** profile selection page

Steps:
1. Layout: profile header + tabs (Dashboard, Criativos, Tarefas)
2. Page Dashboard: 4 cards macro (Valor Investido, Custo/Seguidor médio, Total Criativos, Total Seguidores) + filtro período + grid de posts
3. PostCardCompact: código, link, métricas, chips, click abre modal
4. PostDetailModal: todas as métricas + histórico em chart (Recharts)

**Critério:** ✅ Dashboard renderiza com 4 cards + grid posts + modal abre com detalhes.

---

### E2.1 ⬜ 🔴 Criativos · UI
**CRIAR:** `src/app/(dashboard)/motors/social-selling/[profileSlug]/criativos/page.tsx`, `src/components/social-selling/PostsTable.tsx`, `src/components/social-selling/PostCreateModal.tsx`, `src/components/social-selling/PostMetricsDrawer.tsx`, `src/components/social-selling/PostAnalysisDrawer.tsx`, `src/lib/validators/post.ts`
**EDITAR:** —
**LER:** `docs/PRD.md` F4, `docs/ux-flows.md` F4, `src/components/ui/drawer.tsx`
**NÃO TOCAR:** dashboard perfil

Steps:
1. `validators/post.ts`: `postCreateSchema`, `postMetricsSchema`, `postAnalysisSchema` (discriminated union por type)
2. Table com colunas código, link, orçamento, métricas, chips toggles (Teste, Ativo, Fit), actions
3. Create modal: código, link, orçamento
4. Metrics drawer: 7 inputs + custo/seguidor calculado disabled, nota snapshot
5. Analysis drawer: 3 tabs (Upload TXT, Link externo, Texto livre — markdown)

**Critério:** ✅ Tabela lista posts; create modal funciona; toggles chips atualizam optimistic.

---

### E2.2 ⬜ 🔴 Criativos · Backend + Storage
**CRIAR:** `src/app/api/posts/route.ts`, `src/app/api/posts/[id]/route.ts`, `src/app/api/posts/[id]/metrics/route.ts`, `src/app/api/posts/[id]/analyses/route.ts`, `src/services/posts.service.ts`, `src/types/post.ts`
**EDITAR:** —
**LER:** `docs/PRD.md` §4, `docs/schema.md` posts + post_metrics + post_analyses, `docs/security.md` §7 (Upload)
**NÃO TOCAR:** UI

Steps:
1. `posts.service.ts`: `listByProfile`, `create`, `update` (toggles), `insertMetric`, `insertAnalysis`
2. Análise de tipo `file`: client faz upload direto para Storage `post-analyses/{post_id}/{uuid}.txt`, retorna path; route recebe path + valida; insere linha
3. Análise `link`: valida URL com Zod (apenas http/https)
4. Análise `text`: sanitiza via regex simples (rejeita `<script`, `javascript:`)
5. Validação dupla MIME + size no client antes do upload

**Critério:** ✅ Create post funciona; snapshot de métrica inserido; upload TXT chega no bucket; link/texto salvam.

---

### E3 ⬜ 🔴 Kanban Tarefas
**CRIAR:** `src/app/(dashboard)/motors/social-selling/[profileSlug]/tarefas/page.tsx`, `src/components/social-selling/KanbanBoard.tsx`, `src/components/social-selling/KanbanColumn.tsx`, `src/components/social-selling/TaskCard.tsx`, `src/components/social-selling/TaskCreateModal.tsx`, `src/components/social-selling/TaskDetailDrawer.tsx`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`, `src/services/tasks.service.ts`, `src/hooks/useTasks.ts`, `src/lib/validators/task.ts`, `src/types/task.ts`
**EDITAR:** —
**LER:** `docs/PRD.md` F5, `docs/ux-flows.md` F5, `docs/schema.md` tasks + task_comments
**NÃO TOCAR:** social selling dashboard

Steps:
1. `useTasks`: query + mutation com optimistic update
2. `KanbanBoard` usa `@dnd-kit/core` + `@dnd-kit/sortable` — 4 colunas fixas
3. On drag end: calcula nova `position` (NUMERIC entre vizinhos), PATCH, rollback em erro
4. Create modal: título, descrição, prioridade, assignee, due_date
5. Detail drawer: detalhes + lista comentários + input novo comentário
6. NOTA: dividir em E3.1 UI e E3.2 Backend se passar de 6 arquivos — criar 2 tasks

**Critério:** ✅ 4 colunas renderizam; drag-drop persiste; create/edit/comments funcionam.

---

### E4 ⬜ 🟡 Meta Ads Integration (opcional Fase 2)
**CRIAR:** `src/lib/integrations/meta-ads-adapter.ts`, `src/app/api/integrations/meta-ads/sync/route.ts`
**EDITAR:** `src/services/integrations.service.ts`
**LER:** `docs/PRD.md` F13 (integrações), documentação Meta Graph API
**NÃO TOCAR:** webhook Fluxon

Steps:
1. Adapter consome Graph API com `META_ADS_ACCESS_TOKEN`
2. Endpoint `/api/integrations/meta-ads/sync` (admin/infra) dispara pull manual: busca investimento por campanha do dia, cria snapshots em posts/mentorias mapeados
3. Fase futura: cron Vercel

**Critério:** ✅ Sync manual funciona; falha de API é logada e retornada com mensagem clara.

---

## Bloco F — Polish (Fase 3)

### F1 ⬜ 🟡 Responsividade mobile
**CRIAR:** —
**EDITAR:** `src/components/layout/AppSidebar.tsx` (drawer em mobile), `src/components/mentorias/MentoriaCard.tsx` (ajustes), tabelas (→ cards em mobile), modais (fullscreen), `src/components/social-selling/KanbanBoard.tsx` (scroll horizontal ou tabs)
**LER:** `docs/ux-flows.md` §7 (Responsividade)
**NÃO TOCAR:** services, route handlers, schema

Steps:
1. Sidebar: `<Sheet>` do shadcn em < lg, hamburger no header
2. Grid mentorias: 1 col em mobile, 2 em md, 3 em lg
3. Tabelas principais: componente `<ResponsiveTable>` que vira cards em < md
4. Modais: `max-h-[100dvh]` em mobile
5. Kanban: scroll horizontal em mobile (4 colunas não cabem)

**Critério:** ✅ App usável em 375px de largura (iPhone SE) sem overflow horizontal.

---

### F2 ⬜ 🟡 Error handling + error.tsx em rotas críticas
**CRIAR:** `src/app/(dashboard)/motors/mentorias/error.tsx`, `src/app/(dashboard)/motors/mentorias/[mentoriaId]/error.tsx`, `src/app/(dashboard)/motors/social-selling/error.tsx`, `src/app/(dashboard)/settings/error.tsx`, `src/components/shared/ErrorState.tsx`
**EDITAR:** route handlers (garantir try/catch + console.error padronizado)
**LER:** `docs/architecture.md` §7 (error handling)
**NÃO TOCAR:** services

Steps:
1. ErrorState: ícone + mensagem + botão reset + botão "Voltar"
2. Cada error.tsx usa ErrorState com mensagem contextual
3. Grep em `src/app/api/` para conferir try/catch em todas as rotas

**Critério:** ✅ Erro simulado em rota renderiza UI amigável; logs em Vercel mostram prefixo `[ROTA]`.

---

### F3 ⬜ 🟢 SEO + metadata + robots.txt deny
**CRIAR:** `src/app/robots.ts`, `src/app/sitemap.ts` (vazio/minimal)
**EDITAR:** `src/app/layout.tsx` (metadata root), `src/app/(dashboard)/*/page.tsx` (metadata por página)
**LER:** `docs/PRD.md` §7 (Não-funcionais — SEO)
**NÃO TOCAR:** middleware, services

Steps:
1. `robots.ts`: `Disallow: /` (app interno)
2. `layout.tsx` root metadata: title template, description, icons, noindex
3. Cada page: `export const metadata = { title: 'Mentorias — Bethel Motores' }`

**Critério:** ✅ `/robots.txt` retorna `Disallow: /`; titles corretos em cada rota.

---

### F4 ⬜ 🟡 Audit Logs UI (F16)
**CRIAR:** `src/app/(dashboard)/settings/audit/page.tsx`, `src/components/settings/AuditTable.tsx`, `src/components/settings/AuditDetailDrawer.tsx`, `src/app/api/audit-logs/route.ts`, `src/services/audit.service.ts`
**EDITAR:** services críticos (mentorias, goals, user roles, funnel_templates) — adicionar chamada a `logAudit()` após mutations
**LER:** `docs/PRD.md` F16, `docs/schema.md` audit_logs
**NÃO TOCAR:** role guards

Steps:
1. `audit.service.ts`: `logAudit({ userId, action, entityType, entityId, changes })`, `listAudit(filters)`
2. Page admin-only: tabela filtrável por entity_type, user, date range
3. Drawer mostra changes JSON diff visual (before/after colorido)

**Critério:** ✅ Mutation em meta registra audit log; tabela admin mostra entry.

---

### F5 ⬜ 🔴 ⚙️ MANUAL — Deploy Vercel + env vars
Steps manuais (usuário faz):
1. Criar projeto na Vercel a partir do repo GitHub
2. Configurar env vars no Dashboard Vercel (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (URL de produção)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `WEBHOOK_SECRET_FLUXON` (gerado pela UI e salvo aqui para referência)
3. Configurar domínio custom (ex: `motores.bethel.com.br`)
4. No Supabase Dashboard: adicionar URL de produção em "Site URL" e "Redirect URLs"
5. Configurar SMTP custom para magic link (domínio Bethel) em Supabase → Auth → SMTP
6. Primeiro deploy via push `main`

**Critério:** ✅ Build em produção passa; magic link funciona com domínio bethel; login em produção completo.

---

### F6 ⬜ 🟡 Checklist pre-deploy + README
**CRIAR:** `README.md`
**EDITAR:** —
**LER:** `docs/security.md` §9 (checklist), `docs/instrucoes.md`
**NÃO TOCAR:** —

Steps:
1. README com: sobre o projeto, comandos, estrutura, links para docs
2. Rodar manualmente cada item do checklist pre-deploy de security.md §9
3. Verificar: `rg "console\.log" src/` deve retornar vazio (só `console.error` permitido)
4. Verificar: `rg "any" src/ --type ts` — zero ocorrências fora de comentários

**Critério:** ✅ Checklist completo; README publicado.

---

## Tabela resumo

| Bloco | # tasks | Complexidade | Dependências | Fase |
|---|---|---|---|---|
| A — Setup | 4 (1 manual) | 🟡🟡 | — | 1 |
| B — Auth | 3 | 🟡🟢 | A | 1 |
| C — Layout | 3 | 🟡🟡🟢 | B | 1 |
| D — Mentorias | 14 | 🔴 médio | C | 1 |
| E — Social Selling | 6 | 🔴 alto | C (reaproveita MetricCard, PeriodFilter) | 2 |
| F — Polish | 6 (1 manual) | 🟡 | D (F5 depende de todos) | 3 |

**Total:** 36 tasks · 2 manuais · ~4-6 semanas solo.

Ordem recomendada:
```
A1 → A2 → A3 → A4(manual) → B1 → B2 → B3 → C1 → C2 → C3
  → D1.1 → D1.2 → D2.1 → D2.2 → D2.3 → D3 → D4.1 → D4.2 → D5
  → D9.1 → D9.2 → D6 → D7 → D8.1 → D8.2 → D10 → D11 → D12
  → [Fase 2]
  → E1.1 → E1.2 → E2.1 → E2.2 → E3 → E4
  → [Fase 3]
  → F1 → F2 → F3 → F4 → F5(manual) → F6
```

> Ajuste conforme descoberta — se uma task exceder 6 arquivos, quebre em `.1` / `.2`.
