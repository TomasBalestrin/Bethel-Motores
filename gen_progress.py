"""Gera docs/progress.html substituindo placeholders e listando blocos/tasks."""
from pathlib import Path
import re

PROJECT_NAME = "Bethel Motores"
PROJECT_SLUG = "bethel-motores"
DATE = "21/04/2026"

# Cada task: id, title, complexity (l/m/h), manual, prompt_content
# prompt_content é o miolo (contexto, arquivos, steps, critério) — o header e o retorno são wrapados.

TASKS = {
    "A": {
        "name": "Setup Inicial",
        "open": True,
        "tasks": [
            {
                "id": "A1",
                "title": "Inicializar projeto Next.js",
                "complexity": "l",
                "manual": False,
                "context": "Criar projeto Next.js 14 com TypeScript strict e deps base.",
                "create": "projeto via create-next-app --typescript --tailwind --eslint --app --src-dir",
                "edit": "tsconfig.json (@/ alias + strict options), package.json (scripts), .gitignore",
                "read": "docs/tech-stack.md (Core Stack + Pacotes Extras), CLAUDE.md (regras)",
                "no_touch": "N/A",
                "steps": [
                    "npx create-next-app@latest bethel-motores --typescript --tailwind --eslint --app --src-dir --import-alias '@/*'",
                    "Ajustar tsconfig.json com strict: true e noUncheckedIndexedAccess: true",
                    "npm i @supabase/ssr @supabase/supabase-js zustand @tanstack/react-query react-hook-form zod @hookform/resolvers framer-motion lucide-react date-fns recharts sonner next-safe-action @dnd-kit/core @dnd-kit/sortable bcryptjs",
                    "npm i -D @types/bcryptjs",
                    "Adicionar scripts no package.json: 'typecheck': 'tsc --noEmit', 'lint:strict': 'eslint --max-warnings 0 .'",
                    "Confirmar .gitignore inclui .env.local e .env*.local",
                ],
                "success": "build passou, alias @/ funciona, tsconfig strict",
                "partial": "build passou mas algumas deps faltaram",
                "error": "build falhou",
            },
            {
                "id": "A2",
                "title": "Configurar Tailwind + shadcn + design system",
                "complexity": "m",
                "manual": False,
                "context": "Aplicar design system Bethel e instalar componentes base shadcn.",
                "create": "componentes shadcn: button, input, label, card, dialog, drawer, dropdown-menu, select, alert-dialog, tabs, badge, progress, skeleton, table, separator, tooltip, switch, checkbox, avatar, sonner",
                "edit": "tailwind.config.ts, src/app/globals.css, src/app/layout.tsx, components.json",
                "read": "design system Bethel no repo (HTML/MD), docs/tech-stack.md (Responsividade + Fontes), docs/architecture.md (Nomenclatura)",
                "no_touch": "tsconfig.json, package.json, arquivos criados em A1 fora dos listados",
                "steps": [
                    "Ler design system do repo Bethel para extrair tokens de cor/tipografia",
                    "npx shadcn@latest init — Default + CSS variables yes + pasta src/components/ui",
                    "npx shadcn@latest add button input label card dialog drawer dropdown-menu select alert-dialog tabs badge progress skeleton table separator tooltip switch checkbox avatar sonner",
                    "Configurar Plus Jakarta Sans (headings, --font-jakarta) + Inter (body, --font-inter) via next/font em src/app/layout.tsx",
                    "CSS vars em globals.css: primary #1A5CE6, accent #F2762E, surface, muted, border, destructive, success, warning — light e dark",
                    "tailwind.config.ts: mapear CSS vars em theme.extend.colors e adicionar fontFamily com variables",
                ],
                "success": "shadcn renderiza com tema custom, fontes carregam, <Button> com cor primária",
                "partial": "shadcn ok mas visual precisa ajuste",
                "error": "build falhou ou shadcn não inicializou",
            },
            {
                "id": "A3",
                "title": "Configurar Supabase clients + middleware",
                "complexity": "l",
                "manual": False,
                "context": "Criar clients browser/server/admin + middleware que refresca cookies.",
                "create": "src/lib/supabase/client.ts, src/lib/supabase/server.ts, src/lib/supabase/admin.ts, src/lib/supabase/middleware.ts, src/middleware.ts, .env.local.example",
                "edit": ".gitignore (garantir .env*.local), .eslintrc.json (no-restricted-imports para admin.ts)",
                "read": "docs/security.md §1 (Auth) e §5 (Env vars), docs/architecture.md §5 (Supabase)",
                "no_touch": "arquivos de A1/A2 fora dos listados",
                "steps": [
                    "Criar client.ts com createBrowserClient do @supabase/ssr",
                    "Criar server.ts com createServerClient + cookies() do Next/headers",
                    "Criar admin.ts com createClient do @supabase/supabase-js usando SUPABASE_SERVICE_ROLE_KEY, sem persist session",
                    "Criar supabase/middleware.ts com updateSession(request) que refresca cookies",
                    "Criar src/middleware.ts com matcher excluindo _next, static, api/webhooks, imagens",
                    ".env.local.example: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, WEBHOOK_SECRET_FLUXON",
                    "ESLint rule no-restricted-imports bloqueando @/lib/supabase/admin com override em src/app/api/**",
                ],
                "success": "build ok, middleware compila, import de admin.ts fora de /api gera erro de lint",
                "partial": "build ok mas lint rule não configurada corretamente",
                "error": "build falhou",
            },
            {
                "id": "A4",
                "title": "Aplicar schema no Supabase",
                "complexity": "m",
                "manual": True,
                "context": "Executar todas as migrations do schema.md manualmente no Supabase Dashboard.",
                "create": "arquivos em supabase/migrations/001 a 010 copiando de docs/schema.md",
                "edit": "—",
                "read": "docs/schema.md inteiro",
                "no_touch": "qualquer coisa fora de supabase/migrations/",
                "steps": [
                    "[MANUAL] Criar projeto no Supabase Dashboard (bethel-motores-dev)",
                    "[MANUAL] Copiar URL + ANON_KEY + SERVICE_ROLE_KEY para .env.local",
                    "Criar arquivos supabase/migrations/001_extensions_enums.sql até 010_seed.sql com conteúdo do schema.md",
                    "[MANUAL] Abrir SQL Editor no Dashboard",
                    "[MANUAL] Executar em ordem: 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010",
                    "[MANUAL] Executar SQL de Storage buckets (seção 13 de schema.md) em Storage",
                    "[MANUAL] Verificar RLS: SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity — deve retornar vazio",
                    "[MANUAL] Gerar tipos: npx supabase gen types typescript --project-id [id] > src/types/database.ts",
                ],
                "success": "todas tabelas criadas, RLS ativo, seed populou 2 motores + 2 profiles + template default + Fluxon source, buckets criados, types gerados",
                "partial": "algumas tabelas criadas mas RLS falhou em X / seed parcial",
                "error": "SQL falhou em migration específica",
            },
        ],
    },
    "B": {
        "name": "Autenticação",
        "open": False,
        "tasks": [
            {
                "id": "B1",
                "title": "Login page + auth callback",
                "complexity": "m",
                "manual": False,
                "context": "Página de login com magic link + callback que troca code por sessão.",
                "create": "src/app/(auth)/login/page.tsx, src/app/(auth)/login/LoginForm.tsx, src/app/auth/callback/route.ts, src/app/(auth)/layout.tsx, src/lib/validators/auth.ts",
                "edit": "src/app/layout.tsx (incluir <Toaster /> do sonner)",
                "read": "docs/security.md §1, docs/ux-flows.md §3 (Auth Flow), src/lib/supabase/client.ts, src/components/ui/button.tsx",
                "no_touch": "middleware, arquivos de setup",
                "steps": [
                    "validators/auth.ts: emailSchema = z.string().email().max(255)",
                    "(auth)/layout.tsx: layout minimalista centralizado sem sidebar",
                    "login/page.tsx: Server Component que renderiza <LoginForm />",
                    "LoginForm.tsx ('use client'): RHF + zodResolver, signInWithOtp com emailRedirectTo pro /auth/callback, toast success/error, estados loading/success/error",
                    "auth/callback/route.ts: GET que lê ?code, chama exchangeCodeForSession, redirect /motors ou /login?error=invalid_link",
                    "layout.tsx root: <Toaster richColors position='top-right' /> do sonner",
                ],
                "success": "build ok, /login renderiza form, submit envia OTP",
                "partial": "build ok mas callback quebra",
                "error": "build falhou",
            },
            {
                "id": "B2",
                "title": "Middleware de proteção + role gating",
                "complexity": "m",
                "manual": False,
                "context": "Middleware refresca token e aplica role gating em rotas sensíveis.",
                "create": "src/lib/auth/roles.ts, src/lib/auth/guard.ts",
                "edit": "src/lib/supabase/middleware.ts (adicionar role gating), src/middleware.ts",
                "read": "docs/security.md §2 (3 camadas), src/lib/supabase/server.ts, src/types/database.ts",
                "no_touch": "clients Supabase, login page",
                "steps": [
                    "roles.ts: enum UserRole, constantes ADMIN_ROUTES, INFRA_ROUTES (listas dos paths sensíveis)",
                    "guard.ts: função assertRole(supabase, userId, allowedRoles) que busca user_profiles.role e valida is_active",
                    "Em supabase/middleware.ts: após getUser(), se autenticado buscar profile e aplicar role gating",
                    "Lógica: sem sessão + rota privada → /login; com sessão + /login → /motors; admin-only + não-admin → /motors; infra-or-admin + role inválida → /motors",
                ],
                "success": "rota /settings/users redireciona para /motors se role=copy",
                "partial": "role gating funciona mas middleware reload lento",
                "error": "build falhou ou middleware quebrou",
            },
            {
                "id": "B3",
                "title": "Hook useUser + users.service base",
                "complexity": "l",
                "manual": False,
                "context": "Hook que retorna usuário + profile e service base de usuários.",
                "create": "src/hooks/useUser.ts, src/services/users.service.ts",
                "edit": "—",
                "read": "docs/architecture.md §6 (Data Fetching), src/lib/supabase/client.ts, src/lib/supabase/admin.ts (só para ver padrão)",
                "no_touch": "middleware, clients Supabase",
                "steps": [
                    "useUser.ts: TanStack Query que busca user autenticado + user_profiles relacionado",
                    "users.service.ts: listUsers, getUserProfile, inviteUser (usa admin client + admin.auth.admin.inviteUserByEmail), updateUserRole, deactivateUser",
                ],
                "success": "useUser() retorna { user, profile, isLoading }",
                "partial": "useUser funciona mas types inconsistentes",
                "error": "build falhou",
            },
        ],
    },
    "C": {
        "name": "Layout Base",
        "open": False,
        "tasks": [
            {
                "id": "C1",
                "title": "AppSidebar + AppHeader + Breadcrumbs",
                "complexity": "m",
                "manual": False,
                "context": "Chrome persistente: sidebar com nav role-aware + header com breadcrumbs e avatar.",
                "create": "src/components/layout/AppSidebar.tsx, src/components/layout/AppHeader.tsx, src/components/layout/Breadcrumbs.tsx, src/components/layout/SidebarNavItem.tsx, src/stores/uiStore.ts",
                "edit": "—",
                "read": "docs/ux-flows.md §2, docs/architecture.md §1, src/components/ui/avatar.tsx, src/hooks/useUser.ts",
                "no_touch": "arquivos de auth, setup",
                "steps": [
                    "uiStore.ts: Zustand { sidebarCollapsed, toggleSidebar }, persist em cookie",
                    "AppSidebar.tsx: nav items conforme ux-flows §2.1 (role-aware), ícones Lucide",
                    "AppHeader.tsx: breadcrumbs + avatar dropdown (logout + profile), 56px de altura",
                    "Breadcrumbs.tsx: gera do pathname, segmentos clicáveis exceto último",
                    "SidebarNavItem.tsx: ativo baseado em usePathname(), estado hover/active",
                ],
                "success": "sidebar renderiza, collapse funciona, rota ativa destacada",
                "partial": "renderiza mas collapse não persiste",
                "error": "build falhou",
            },
            {
                "id": "C2",
                "title": "Dashboard layout + ProtectedRoute + error/404",
                "complexity": "m",
                "manual": False,
                "context": "Layout do grupo (dashboard) com validação de sessão, error boundary e 404.",
                "create": "src/app/(dashboard)/layout.tsx, src/components/layout/ProtectedRoute.tsx, src/app/(dashboard)/error.tsx, src/app/(dashboard)/not-found.tsx",
                "edit": "—",
                "read": "src/components/layout/AppSidebar.tsx, src/components/layout/AppHeader.tsx",
                "no_touch": "middleware, login, sidebar",
                "steps": [
                    "(dashboard)/layout.tsx: Server Component valida sessão, carrega profile, renderiza sidebar + header + <main>",
                    "ProtectedRoute.tsx: wrapper client com allowedRoles, redireciona se role não compatível",
                    "error.tsx: boundary com botão 'Tentar novamente'",
                    "not-found.tsx: 404 com link pra /motors",
                ],
                "success": "acessar /motors sem login redireciona /login; layout aparece para autenticado",
                "partial": "layout ok mas error boundary não captura",
                "error": "build falhou",
            },
            {
                "id": "C3",
                "title": "Home de motores + MotorCard",
                "complexity": "l",
                "manual": False,
                "context": "Página /motors lista motores ativos como cards grandes.",
                "create": "src/app/(dashboard)/motors/page.tsx, src/components/motors/MotorCard.tsx, src/components/shared/EmptyState.tsx, src/components/shared/LoadingState.tsx, src/services/motors.service.ts, src/types/motor.ts",
                "edit": "—",
                "read": "docs/PRD.md F1, docs/ux-flows.md F1, docs/schema.md seção 4 (motors)",
                "no_touch": "dashboard layout, sidebar",
                "steps": [
                    "types/motor.ts: Motor, MotorWithStats",
                    "motors.service.ts: listActiveMotors com contagem agregada (count de mentorias ativas / count de social_profiles)",
                    "motors/page.tsx: Server Component, grid com <MotorCard />, Suspense + <LoadingState />, empty via <EmptyState />",
                    "MotorCard.tsx: card clicável (<Link>), ícone Lucide dinâmico, nome, descrição, contador",
                    "EmptyState.tsx: ícone + título + descrição + CTA opcional",
                    "LoadingState.tsx: skeleton grid",
                ],
                "success": "/motors renderiza 2 cards; click leva para rota do motor",
                "partial": "renderiza mas ícones dinâmicos quebram",
                "error": "build falhou",
            },
        ],
    },
    "D": {
        "name": "Motor de Mentorias (Fase 1)",
        "open": False,
        "tasks": [
            {
                "id": "D1.1",
                "title": "Dashboard Motor Mentorias — UI",
                "complexity": "m",
                "manual": False,
                "context": "Dashboard agregado do motor Mentorias com 5 cards macro e filtro de período.",
                "create": "src/app/(dashboard)/motors/mentorias/page.tsx, src/components/dashboard/MetricCard.tsx, src/components/dashboard/PeriodFilter.tsx, src/components/dashboard/GoalProgress.tsx, src/stores/periodStore.ts, src/types/common.ts",
                "edit": "—",
                "read": "docs/PRD.md F6, docs/ux-flows.md F6, docs/schema.md view v_mentorias_current, src/components/shared/LoadingState.tsx",
                "no_touch": "motors/page.tsx",
                "steps": [
                    "common.ts: tipos Period, DateRange",
                    "periodStore.ts: Zustand { period, setPeriod } com persist",
                    "PeriodFilter.tsx: dropdown 7d/30d/90d/mês atual/custom com DateRangePicker",
                    "MetricCard.tsx: label + valor formatado + delta % + <GoalProgress /> opcional",
                    "GoalProgress.tsx: barra progresso realizado/meta",
                    "motors/mentorias/page.tsx: Server Component que busca stats do período e renderiza 5 cards + placeholder gráfico + botões (Listagem, Comparar)",
                ],
                "success": "página renderiza com 5 cards zerados + filtro de período funciona",
                "partial": "renderiza mas filtro não propaga",
                "error": "build falhou",
            },
            {
                "id": "D1.2",
                "title": "Dashboard Motor Mentorias — Backend",
                "complexity": "m",
                "manual": False,
                "context": "Service de agregação + helpers de format/calc/date-range.",
                "create": "src/app/api/motors/[slug]/stats/route.ts, src/services/mentorias.service.ts, src/lib/utils/format.ts, src/lib/utils/calc.ts, src/lib/utils/date-range.ts",
                "edit": "src/app/(dashboard)/motors/mentorias/page.tsx (consumir service direto — é Server Component)",
                "read": "docs/architecture.md §4, docs/schema.md views, src/lib/supabase/server.ts",
                "no_touch": "components dashboard",
                "steps": [
                    "format.ts: formatCurrency, formatPercent(n, 1), formatCompactNumber, formatDateBR, formatDateTimeBR",
                    "calc.ts: calcPercent(num, den, 1) com fallback zero, calcDelta(current, previous)",
                    "date-range.ts: periodToRange(period) retorna { from, to, previousFrom, previousTo }",
                    "mentorias.service.ts: getMotorStats(supabase, {from, to}) agregando v_mentorias_current com comparação de período anterior",
                    "Route handler GET para clients externos (opcional)",
                    "Page consome service direto",
                ],
                "success": "cards mostram valores reais, delta calcula, filtro atualiza",
                "partial": "agregação ok mas delta quebrado",
                "error": "build falhou",
            },
            {
                "id": "D2.1",
                "title": "Mentorias · Listagem — UI",
                "complexity": "h",
                "manual": False,
                "context": "Listagem de mentorias com cards idênticos à referência visual do Bethel (pills + grid 2x2 + 4 barras coloridas).",
                "create": "src/app/(dashboard)/motors/mentorias/listagem/page.tsx, src/components/mentorias/MentoriaCard.tsx, src/components/mentorias/MentoriaFilters.tsx, src/components/mentorias/MentoriaFormModal.tsx, src/hooks/useMentorias.ts, src/lib/validators/mentoria.ts",
                "edit": "—",
                "read": "docs/PRD.md F7, docs/ux-flows.md F7, imagem referência /mnt/user-data/uploads/1776740135478_image.png (se disponível no repo)",
                "no_touch": "dashboard global, motors page",
                "steps": [
                    "validators/mentoria.ts: mentoriaCreateSchema, mentoriaUpdateSchema, mentoriaMetricsSchema",
                    "useMentorias.ts: TanStack Query com filtros + mutations",
                    "MentoriaCard.tsx conforme referência: nome, data ptBR, 2 pills (status âmbar/verde + especialista azul), grid 2x2 (grupo, ao vivo, vendas, valor), 4 barras progresso coloridas (Comparecimento azul, Agendamento roxo, Comparecimento Call laranja, Conversão Call verde). Se sem_debriefing=true, label '(sem debriefing)'",
                    "MentoriaFilters.tsx: busca debounce 300ms, dropdown status, dropdown ordenação",
                    "MentoriaFormModal.tsx: RHF+Zod, datetime-local, select social_profiles",
                    "listagem/page.tsx: Server Component com initial data, filtros via URL",
                ],
                "success": "listagem renderiza cards idênticos à referência visual",
                "partial": "cards renderizam mas visual difere da referência",
                "error": "build falhou",
            },
            {
                "id": "D2.2",
                "title": "Mentorias · Listagem — Backend",
                "complexity": "m",
                "manual": False,
                "context": "API routes GET/POST/PATCH mentorias + service.",
                "create": "src/app/api/mentorias/route.ts, src/app/api/mentorias/[id]/route.ts, src/types/mentoria.ts, src/services/social-profiles.service.ts",
                "edit": "src/services/mentorias.service.ts (adicionar listMentorias, createMentoria, getMentoriaById)",
                "read": "docs/PRD.md §4, docs/architecture.md §4, src/lib/auth/guard.ts, src/lib/validators/mentoria.ts",
                "no_touch": "UI de listagem",
                "steps": [
                    "types/mentoria.ts: Mentoria, MentoriaWithMetrics, MentoriaInput",
                    "social-profiles.service.ts: listSocialProfiles para popular select",
                    "mentorias.service.ts: listMentorias (via view), createMentoria, getMentoriaById (com funnels)",
                    "/api/mentorias/route.ts: GET + POST (guard admin/trafego + zod)",
                    "/api/mentorias/[id]/route.ts: GET + PATCH (guard + zod)",
                ],
                "success": "POST cria mentoria, GET retorna com métricas da view, guards bloqueiam role=copy",
                "partial": "CRUD ok mas filtros não aplicam",
                "error": "build falhou",
            },
            {
                "id": "D2.3",
                "title": "Mentorias · Update Metrics Drawer",
                "complexity": "m",
                "manual": False,
                "context": "Drawer para atualizar métricas da mentoria criando snapshot nova (append-only).",
                "create": "src/components/mentorias/MentoriaMetricsDrawer.tsx, src/app/api/mentorias/[id]/metrics/route.ts",
                "edit": "src/services/mentorias.service.ts (add insertMentoriaMetrics), src/components/mentorias/MentoriaCard.tsx (botão 'Atualizar')",
                "read": "docs/ux-flows.md F8, docs/schema.md mentoria_metrics (append-only), src/components/ui/drawer.tsx",
                "no_touch": "card layout core",
                "steps": [
                    "MentoriaMetricsDrawer.tsx: drawer shadcn, form RHF, 9 inputs numéricos, nota 'nova snapshot preserva histórico'",
                    "insertMentoriaMetrics: INSERT em mentoria_metrics (NUNCA UPDATE)",
                    "POST /api/mentorias/[id]/metrics: guard admin/trafego + zod + insert + invalidate query cliente",
                ],
                "success": "drawer abre, submit grava snapshot nova, card atualiza sem reload",
                "partial": "drawer funciona mas query não invalida",
                "error": "build falhou",
            },
            {
                "id": "D3",
                "title": "Mentoria · Dashboard interno",
                "complexity": "h",
                "manual": False,
                "context": "Dashboard interno de uma mentoria específica com cards detalhados e tabs.",
                "create": "src/app/(dashboard)/motors/mentorias/[mentoriaId]/page.tsx, src/app/(dashboard)/motors/mentorias/[mentoriaId]/layout.tsx, src/components/mentorias/MentoriaHeader.tsx, src/components/mentorias/MentoriaMetricsGrid.tsx, src/components/mentorias/MentoriaTabs.tsx",
                "edit": "—",
                "read": "docs/PRD.md F8, docs/ux-flows.md F8, src/components/dashboard/MetricCard.tsx, src/services/mentorias.service.ts",
                "no_touch": "listagem, drawer de métricas",
                "steps": [
                    "[mentoriaId]/layout.tsx: Server Component que fetch mentoria + funnels + métricas",
                    "MentoriaHeader.tsx: nome, data, pill status, pill especialista, botão Editar (reuso MentoriaFormModal)",
                    "MentoriaMetricsGrid.tsx: card Investimento Total + 7 cards (Leads Grupo/Ao Vivo/Agendamentos/Calls/Vendas/Valor Vendas/Valor Entrada) + botão 'Atualizar métricas'",
                    "MentoriaTabs.tsx: Dashboard (current), Tráfego, Disparos",
                ],
                "success": "/motors/mentorias/[id] renderiza header + cards + tabs",
                "partial": "renderiza mas tabs não navegam",
                "error": "build falhou",
            },
            {
                "id": "D4.1",
                "title": "Funis da mentoria — UI",
                "complexity": "h",
                "manual": False,
                "context": "Funis vinculados à mentoria renderizados como cards expansíveis com indicadores.",
                "create": "src/components/mentorias/FunnelSection.tsx, src/components/mentorias/FunnelCard.tsx, src/components/mentorias/FunnelAddModal.tsx, src/components/mentorias/FunnelEditDrawer.tsx, src/hooks/useFunnels.ts, src/lib/validators/funnel.ts",
                "edit": "src/app/(dashboard)/motors/mentorias/[mentoriaId]/page.tsx (adicionar <FunnelSection />)",
                "read": "docs/PRD.md F9, docs/ux-flows.md F9, docs/schema.md funnel_templates + funnels + funnel_metric_snapshots",
                "no_touch": "MetricsGrid, drawer de métricas de mentoria",
                "steps": [
                    "validators/funnel.ts: funnelCreateSchema, funnelSnapshotSchema",
                    "useFunnels.ts: query por mentoria_id via view v_funnels_current_values",
                    "FunnelSection.tsx: header 'Funis' + botão Adicionar + lista de <FunnelCard />",
                    "FunnelCard.tsx: expansível, header com nome + template + ícone fonte, grid de campos, botão 'Editar indicadores'",
                    "FunnelAddModal.tsx: nome, select template, URL lista, toggle funil de tráfego",
                    "FunnelEditDrawer.tsx: form dinâmico baseado em funnel_template_fields; campos source != manual ficam disabled + tooltip",
                ],
                "success": "lista funis, adicionar cria, editar cria snapshot novo (após D4.2)",
                "partial": "UI renderiza mas submit quebra (backend ainda não existe)",
                "error": "build falhou",
            },
            {
                "id": "D4.2",
                "title": "Funis — Backend",
                "complexity": "m",
                "manual": False,
                "context": "API routes para criar funis, gravar snapshots e consultar histórico.",
                "create": "src/app/api/mentorias/[id]/funnels/route.ts, src/app/api/funnels/[id]/route.ts, src/app/api/funnels/[id]/snapshot/route.ts, src/app/api/funnels/[id]/history/route.ts, src/services/funnels.service.ts, src/types/funnel.ts",
                "edit": "—",
                "read": "docs/PRD.md §4, docs/schema.md (snapshots append-only, field_key TEXT)",
                "no_touch": "UI de funis",
                "steps": [
                    "types/funnel.ts: Funnel, FunnelTemplate, FunnelTemplateField, FunnelCurrentValue, FunnelSnapshotInput",
                    "funnels.service.ts: listFunnelsByMentoria (com current values), createFunnel, updateFunnel, insertFunnelSnapshot (bulk insert — um por campo), listFieldHistory",
                    "Rotas com guard admin/trafego/infra",
                    "Snapshot endpoint valida que campos source != manual não são enviados pelo client",
                ],
                "success": "criar funil, editar cria N snapshots, histórico retorna DESC",
                "partial": "create ok, snapshot quebra",
                "error": "build falhou",
            },
            {
                "id": "D5",
                "title": "Settings · Funnel Templates",
                "complexity": "h",
                "manual": False,
                "context": "Editor de templates de funil (admin/infra): criar template, adicionar/editar/remover campos, drag-and-drop reorder.",
                "create": "src/app/(dashboard)/settings/funnel-templates/page.tsx, src/app/(dashboard)/settings/funnel-templates/[templateId]/page.tsx, src/components/mentorias/FunnelTemplateEditor.tsx, src/components/mentorias/FunnelFieldEditor.tsx, src/app/api/funnel-templates/route.ts, src/app/api/funnel-templates/[id]/route.ts",
                "edit": "src/services/funnels.service.ts (add listTemplates, createTemplate, updateTemplate, addField, updateField, deleteField)",
                "read": "docs/PRD.md F9 (templates), docs/ux-flows.md F9, src/lib/validators/funnel.ts, docs/schema.md funnel_template_fields",
                "no_touch": "funis dentro de mentoria",
                "steps": [
                    "Page lista templates com count de campos e count de funnels usando",
                    "Editor: dados gerais + lista campos drag-and-drop (reorder atualiza display_order)",
                    "Field editor modal: key (disabled se editing e há snapshots), label, type, source default, obrigatório, agregável",
                    "Warning ao deletar field com snapshots: 'N snapshots — campo oculto mas snapshots preservados'",
                    "Guard admin/infra em todas as rotas",
                ],
                "success": "admin cria template novo; infra edita default; role=copy bloqueado",
                "partial": "CRUD ok mas reorder drag não persiste",
                "error": "build falhou",
            },
            {
                "id": "D6",
                "title": "Mentoria · Tráfego",
                "complexity": "m",
                "manual": False,
                "context": "Aba Tráfego com total investido, input rápido, gráfico e tabela.",
                "create": "src/app/(dashboard)/motors/mentorias/[mentoriaId]/trafego/page.tsx, src/components/mentorias/TrafegoTable.tsx, src/components/mentorias/TrafegoInlineForm.tsx, src/components/mentorias/TrafegoChart.tsx, src/app/api/mentorias/[id]/trafego/route.ts",
                "edit": "src/services/mentorias.service.ts (add listTrafegoByMentoria, insertTrafegoEntry)",
                "read": "docs/PRD.md F10, docs/ux-flows.md F10, src/components/mentorias/MentoriaTabs.tsx",
                "no_touch": "dashboard, funis",
                "steps": [
                    "Page consome layout da mentoria, renderiza total + input rápido + chart + tabela",
                    "Chart Recharts linha — investimento por dia",
                    "Inline form: data, valor, funil destino (select dos funis da mentoria) — Enter submete",
                    "Tabela server-rendered + TanStack Query para refresh",
                ],
                "success": "aba mostra chart + tabela, input rápido adiciona linha",
                "partial": "tabela ok mas chart não renderiza",
                "error": "build falhou",
            },
            {
                "id": "D7",
                "title": "Mentoria · Disparos",
                "complexity": "m",
                "manual": False,
                "context": "Aba Disparos com eventos Fluxon (volume, custo) e botão reprocessar.",
                "create": "src/app/(dashboard)/motors/mentorias/[mentoriaId]/disparos/page.tsx, src/components/mentorias/DisparosList.tsx, src/components/mentorias/DisparoEventDrawer.tsx, src/app/api/integrations/events/[id]/reprocess/route.ts",
                "edit": "src/services/mentorias.service.ts (add listDisparosByMentoria), src/services/integrations.service.ts (criar com reprocessEvent)",
                "read": "docs/PRD.md F11, docs/ux-flows.md F11, docs/schema.md integration_events",
                "no_touch": "webhooks (próxima task)",
                "steps": [
                    "Page: totalizadores + lista eventos (join com integration_sources slug=fluxon, filter mentoria_id)",
                    "DisparoEventDrawer: payload JSON bruto formatado + status + botão reprocessar",
                    "POST reprocess: guard admin/infra, reseta status para pending e chama processor",
                ],
                "success": "aba lista eventos; reprocessar funciona (após D9.1)",
                "partial": "lista ok, reprocessar não conecta ao processor",
                "error": "build falhou",
            },
            {
                "id": "D8.1",
                "title": "Mentorias · Comparar — UI",
                "complexity": "h",
                "manual": False,
                "context": "Comparação lado a lado de 2 a 4 mentorias + tabela de diferenças %.",
                "create": "src/app/(dashboard)/motors/mentorias/comparar/page.tsx, src/components/mentorias/CompareSelector.tsx, src/components/mentorias/CompareGrid.tsx, src/components/mentorias/CompareDiffTable.tsx",
                "edit": "—",
                "read": "docs/PRD.md F12, docs/ux-flows.md F12, src/components/mentorias/MentoriaCard.tsx",
                "no_touch": "MentoriaCard",
                "steps": [
                    "Page client component com multi-select até 4",
                    "CompareSelector.tsx: combobox shadcn com busca",
                    "CompareGrid.tsx: reutiliza <MentoriaCard /> em colunas",
                    "CompareDiffTable.tsx: métricas × mentorias, última coluna = variação % vs base (primeira)",
                    "Botão 'Exportar CSV' (Blob + download local)",
                ],
                "success": "selecionar 2 mentorias mostra cards + tabela variação %",
                "partial": "grid ok, tabela variação quebra",
                "error": "build falhou",
            },
            {
                "id": "D8.2",
                "title": "Comparar — Backend",
                "complexity": "m",
                "manual": False,
                "context": "Endpoint /api/compare recebe IDs e retorna dados agregados.",
                "create": "src/app/api/compare/route.ts",
                "edit": "src/services/mentorias.service.ts (add compareByIds(supabase, ids))",
                "read": "docs/schema.md view v_mentorias_current, src/lib/validators/mentoria.ts",
                "no_touch": "UI compare",
                "steps": [
                    "Zod: compareSchema = z.object({ ids: z.array(z.string().uuid()).min(2).max(4) })",
                    "GET /api/compare?ids=a,b,c: parse, service, retorna MentoriaWithMetrics[] + metadados",
                ],
                "success": "endpoint retorna 200; request com 1 ou >4 retorna 400",
                "partial": "retorna dados mas sem validação Zod",
                "error": "build falhou",
            },
            {
                "id": "D9.1",
                "title": "Webhook genérico + Fluxon adapter",
                "complexity": "h",
                "manual": False,
                "context": "Endpoint de webhook que recebe payload externo, valida secret, salva cru e processa async via mapping.",
                "create": "src/app/api/webhooks/[sourceSlug]/route.ts, src/lib/integrations/webhook-router.ts, src/lib/integrations/fluxon-adapter.ts, src/services/integrations.service.ts, src/lib/validators/integration.ts",
                "edit": "src/middleware.ts (confirmar /api/webhooks excluído do matcher auth)",
                "read": "docs/PRD.md F13, docs/security.md §4.4 (webhook auth), docs/schema.md integrations",
                "no_touch": "UI settings (próxima task)",
                "steps": [
                    "integration.ts: mappingSchema (array de {source_path, target_field, target_table})",
                    "webhook-router.ts: processWebhook(payload, source) aplica mapping e INSERT snapshots/metrics",
                    "fluxon-adapter.ts: normaliza payload Fluxon → formato do router",
                    "Route handler: valida secret (bcrypt.compare), salva em integration_events, chama processor, retorna 200",
                    "Deduplicação: source_event_id já existe → retorna 200 sem reprocessar",
                    "integrations.service.ts: listSources, createSource (gera secret + salva hash), updateMapping, reprocessEvent",
                ],
                "success": "POST /api/webhooks/fluxon com secret válido salva evento; mapping aplica em mentoria_metrics",
                "partial": "salva cru mas mapping não aplica",
                "error": "build falhou",
            },
            {
                "id": "D9.2",
                "title": "Settings · Integrations — UI",
                "complexity": "h",
                "manual": False,
                "context": "Admin/Infra configura integrações, vê payloads recebidos e edita mapping.",
                "create": "src/app/(dashboard)/settings/integrations/page.tsx, src/app/(dashboard)/settings/integrations/[sourceId]/page.tsx, src/components/integrations/SourceCard.tsx, src/components/integrations/SourceCreateModal.tsx, src/components/integrations/SecretDisplayModal.tsx, src/components/integrations/MappingEditor.tsx",
                "edit": "src/services/integrations.service.ts (add getSourceWithRecentEvents)",
                "read": "docs/PRD.md F13, docs/ux-flows.md F13, src/components/ui/dialog.tsx",
                "no_touch": "webhook route",
                "steps": [
                    "Lista de sources + botão Nova",
                    "Modal criar: slug, nome, tipo → após criar, SecretDisplayModal UMA ÚNICA VEZ + botão copiar",
                    "Detail page: dados + últimos 10 eventos + editor de mapping",
                    "MappingEditor: lista campos do payload detectados + dropdown 'Mapear para'",
                    "Preview live: 'Se este payload chegasse, geraria: [...]'",
                ],
                "success": "admin/infra cria source; secret mostrado uma vez; mapping persiste",
                "partial": "cria source mas mapping editor não salva",
                "error": "build falhou",
            },
            {
                "id": "D10",
                "title": "Settings · Metas (Goals)",
                "complexity": "m",
                "manual": False,
                "context": "Admin configura metas por mês × motor × mentoria; dashboards mostram progresso.",
                "create": "src/app/(dashboard)/settings/goals/page.tsx, src/components/goals/GoalsTable.tsx, src/components/goals/GoalCreateModal.tsx, src/app/api/goals/route.ts, src/services/goals.service.ts, src/lib/validators/goal.ts",
                "edit": "src/components/dashboard/MetricCard.tsx (integrar <GoalProgress /> quando goal existir)",
                "read": "docs/PRD.md F14, docs/ux-flows.md F14, docs/schema.md goals (CHECK constraint)",
                "no_touch": "dashboards principais (só MetricCard)",
                "steps": [
                    "goals.service.ts: CRUD + getGoalByScopeAndPeriod",
                    "Route handler guard admin",
                    "Modal: scope (radio motor/mentoria), select, metric_key, target_value, month/year",
                    "Tabela com edit inline em target_value",
                    "MetricCard aceita prop goal? e renderiza <GoalProgress />",
                ],
                "success": "admin cria goal; dashboard mostra barra progresso",
                "partial": "cria goal mas MetricCard não integra",
                "error": "build falhou",
            },
            {
                "id": "D11",
                "title": "Settings · Usuários",
                "complexity": "m",
                "manual": False,
                "context": "Admin convida usuários via magic link e gerencia roles.",
                "create": "src/app/(dashboard)/settings/users/page.tsx, src/components/users/UsersTable.tsx, src/components/users/UserInviteModal.tsx, src/components/users/UserRoleInlineEdit.tsx, src/app/api/users/route.ts, src/app/api/users/invite/route.ts, src/app/api/users/[id]/route.ts",
                "edit": "src/services/users.service.ts (implementar invite completo com admin.auth.admin.inviteUserByEmail)",
                "read": "docs/PRD.md F15, docs/ux-flows.md F15, src/lib/supabase/admin.ts",
                "no_touch": "middleware, guards",
                "steps": [
                    "Guard admin em todas rotas",
                    "Invite usa createAdminClient().auth.admin.inviteUserByEmail(email, {data: {role, name}})",
                    "Trigger handle_new_user cria user_profiles com role do raw_user_meta_data",
                    "UI: tabela + modal convidar + edit inline role + action Desativar com AlertDialog",
                ],
                "success": "admin convida; magic link chega; usuário entra com role convidada",
                "partial": "invite funciona mas role não é setada corretamente",
                "error": "build falhou",
            },
            {
                "id": "D12",
                "title": "Redirect raiz / → /motors",
                "complexity": "l",
                "manual": False,
                "context": "Server Component raiz que redireciona para /motors se logado ou /login se não.",
                "create": "src/app/page.tsx",
                "edit": "—",
                "read": "docs/ux-flows.md §1 (mapa de rotas), src/lib/supabase/server.ts",
                "no_touch": "middleware",
                "steps": [
                    "Server Component checa sessão; redirect /motors se logado, /login se não",
                ],
                "success": "/ redireciona corretamente conforme sessão",
                "partial": "redirect funciona mas loop em alguns casos",
                "error": "build falhou",
            },
        ],
    },
    "E": {
        "name": "Motor Social Selling (Fase 2)",
        "open": False,
        "tasks": [
            {
                "id": "E1.1",
                "title": "Social Selling · Seleção de perfil",
                "complexity": "m",
                "manual": False,
                "context": "Página /motors/social-selling lista perfis ativos como cards.",
                "create": "src/app/(dashboard)/motors/social-selling/page.tsx, src/components/social-selling/ProfileSelectionCard.tsx, src/app/api/social-profiles/route.ts",
                "edit": "src/services/social-profiles.service.ts (add listProfilesWithStats)",
                "read": "docs/PRD.md F2, docs/ux-flows.md F2+F3, src/components/motors/MotorCard.tsx",
                "no_touch": "motors home",
                "steps": [
                    "listProfilesWithStats retorna profiles + count posts ativos + total seguidores",
                    "Page Server Component renderiza grid de <ProfileSelectionCard />",
                    "Card: avatar, nome, @handle, 'N seguidores no mês'",
                ],
                "success": "renderiza Cleiton + Julia; click leva para /motors/social-selling/[slug]",
                "partial": "renderiza mas stats vazias",
                "error": "build falhou",
            },
            {
                "id": "E1.2",
                "title": "Social Selling · Dashboard do perfil",
                "complexity": "h",
                "manual": False,
                "context": "Dashboard detalhado do perfil com 4 cards macro e grid de posts.",
                "create": "src/app/(dashboard)/motors/social-selling/[profileSlug]/page.tsx, src/app/(dashboard)/motors/social-selling/[profileSlug]/layout.tsx, src/components/social-selling/ProfileHeader.tsx, src/components/social-selling/PostsGrid.tsx, src/components/social-selling/PostCardCompact.tsx, src/components/social-selling/PostDetailModal.tsx",
                "edit": "src/services/social-profiles.service.ts (add getProfileBySlug, getProfileDashboardStats)",
                "read": "docs/PRD.md F3, docs/ux-flows.md F2+F3, docs/schema.md view v_posts_current",
                "no_touch": "profile selection page",
                "steps": [
                    "Layout: profile header + tabs (Dashboard, Criativos, Tarefas)",
                    "Page Dashboard: 4 cards macro + filtro período + grid posts",
                    "PostCardCompact: código, link, métricas, chips, click abre modal",
                    "PostDetailModal: todas métricas + histórico chart Recharts",
                ],
                "success": "dashboard renderiza 4 cards + grid posts + modal abre",
                "partial": "cards ok mas modal quebra",
                "error": "build falhou",
            },
            {
                "id": "E2.1",
                "title": "Criativos · UI",
                "complexity": "h",
                "manual": False,
                "context": "CRUD de posts como tabela com ações de métricas, análise e toggles.",
                "create": "src/app/(dashboard)/motors/social-selling/[profileSlug]/criativos/page.tsx, src/components/social-selling/PostsTable.tsx, src/components/social-selling/PostCreateModal.tsx, src/components/social-selling/PostMetricsDrawer.tsx, src/components/social-selling/PostAnalysisDrawer.tsx, src/lib/validators/post.ts",
                "edit": "—",
                "read": "docs/PRD.md F4, docs/ux-flows.md F4, src/components/ui/drawer.tsx",
                "no_touch": "dashboard perfil",
                "steps": [
                    "validators/post.ts: postCreateSchema, postMetricsSchema, postAnalysisSchema (discriminated union)",
                    "Table: colunas código, link, orçamento, métricas, chips toggles (Teste/Ativo/Fit), actions",
                    "Create modal: código, link, orçamento",
                    "Metrics drawer: 7 inputs + custo/seguidor calculado disabled",
                    "Analysis drawer: 3 tabs (Upload TXT, Link, Texto markdown)",
                ],
                "success": "tabela lista posts; create modal funciona; chips toggle optimistic",
                "partial": "tabela ok mas drawers quebram",
                "error": "build falhou",
            },
            {
                "id": "E2.2",
                "title": "Criativos · Backend + Storage",
                "complexity": "h",
                "manual": False,
                "context": "API routes de posts + upload de análises no Supabase Storage.",
                "create": "src/app/api/posts/route.ts, src/app/api/posts/[id]/route.ts, src/app/api/posts/[id]/metrics/route.ts, src/app/api/posts/[id]/analyses/route.ts, src/services/posts.service.ts, src/types/post.ts",
                "edit": "—",
                "read": "docs/PRD.md §4, docs/schema.md posts + metrics + analyses, docs/security.md §7 (Upload)",
                "no_touch": "UI",
                "steps": [
                    "posts.service.ts: listByProfile, create, update (toggles), insertMetric, insertAnalysis",
                    "Análise type=file: client faz upload direto Storage 'post-analyses/{post_id}/{uuid}.txt', retorna path; route valida + insere linha",
                    "Análise type=link: valida URL Zod (apenas http/https)",
                    "Análise type=text: sanitiza via regex (rejeita <script, javascript:)",
                    "Validação dupla MIME + size no client antes do upload",
                ],
                "success": "create post ok; snapshot inserido; upload TXT vai pro bucket; link/texto salvam",
                "partial": "CRUD ok, upload Storage quebra",
                "error": "build falhou",
            },
            {
                "id": "E3",
                "title": "Kanban de Tarefas",
                "complexity": "h",
                "manual": False,
                "context": "Kanban standalone por perfil com 4 colunas e drag-and-drop via @dnd-kit.",
                "create": "src/app/(dashboard)/motors/social-selling/[profileSlug]/tarefas/page.tsx, src/components/social-selling/KanbanBoard.tsx, src/components/social-selling/KanbanColumn.tsx, src/components/social-selling/TaskCard.tsx, src/components/social-selling/TaskCreateModal.tsx, src/components/social-selling/TaskDetailDrawer.tsx, src/app/api/tasks/route.ts, src/app/api/tasks/[id]/route.ts, src/services/tasks.service.ts, src/hooks/useTasks.ts, src/lib/validators/task.ts, src/types/task.ts",
                "edit": "—",
                "read": "docs/PRD.md F5, docs/ux-flows.md F5, docs/schema.md tasks + task_comments",
                "no_touch": "social selling dashboard",
                "steps": [
                    "Se >6 arquivos CRIAR, dividir em E3.1 UI e E3.2 Backend",
                    "useTasks: query + mutation com optimistic update",
                    "KanbanBoard usa @dnd-kit/core + sortable — 4 colunas fixas",
                    "On drag end: calcula nova position (NUMERIC entre vizinhos), PATCH, rollback em erro",
                    "Create modal: título, descrição, prioridade, assignee, due_date",
                    "Detail drawer: detalhes + lista comentários + input novo",
                ],
                "success": "4 colunas renderizam; drag persiste; create/edit/comments funcionam",
                "partial": "kanban renderiza mas drag não persiste",
                "error": "build falhou",
            },
            {
                "id": "E4",
                "title": "Meta Ads Integration (opcional Fase 2)",
                "complexity": "m",
                "manual": False,
                "context": "Integração Meta Ads com pull manual para sincronizar investimento por campanha.",
                "create": "src/lib/integrations/meta-ads-adapter.ts, src/app/api/integrations/meta-ads/sync/route.ts",
                "edit": "src/services/integrations.service.ts",
                "read": "docs/PRD.md F13 (integrações), documentação Meta Graph API",
                "no_touch": "webhook Fluxon",
                "steps": [
                    "Adapter consome Graph API com META_ADS_ACCESS_TOKEN",
                    "Endpoint /api/integrations/meta-ads/sync (admin/infra): busca investimento por campanha do dia, cria snapshots em posts/mentorias mapeados",
                    "Falha de API logada e retornada com mensagem clara",
                ],
                "success": "sync manual funciona; erros logados",
                "partial": "funciona mas Meta Ads rate limit bloqueia",
                "error": "build falhou ou token inválido",
            },
        ],
    },
    "F": {
        "name": "Polish (Fase 3)",
        "open": False,
        "tasks": [
            {
                "id": "F1",
                "title": "Responsividade mobile",
                "complexity": "m",
                "manual": False,
                "context": "Ajustes mobile: sidebar drawer, tabelas cards, modais fullscreen, kanban scroll horizontal.",
                "create": "—",
                "edit": "src/components/layout/AppSidebar.tsx (drawer em mobile), src/components/mentorias/MentoriaCard.tsx, tabelas (→ cards em mobile), modais (fullscreen), KanbanBoard (scroll horizontal)",
                "read": "docs/ux-flows.md §7 (Responsividade)",
                "no_touch": "services, route handlers, schema",
                "steps": [
                    "Sidebar: <Sheet> shadcn em <lg, hamburger no header",
                    "Grid mentorias: 1 col mobile, 2 md, 3 lg",
                    "Tabelas: componente <ResponsiveTable> que vira cards em <md",
                    "Modais: max-h-[100dvh] em mobile",
                    "Kanban: scroll horizontal mobile",
                ],
                "success": "app usável em 375px sem overflow horizontal",
                "partial": "responsivo em páginas principais, uma ou duas quebram",
                "error": "build falhou",
            },
            {
                "id": "F2",
                "title": "Error handling + error.tsx em rotas críticas",
                "complexity": "m",
                "manual": False,
                "context": "Error boundaries em rotas críticas + padronização de try/catch nas route handlers.",
                "create": "src/app/(dashboard)/motors/mentorias/error.tsx, src/app/(dashboard)/motors/mentorias/[mentoriaId]/error.tsx, src/app/(dashboard)/motors/social-selling/error.tsx, src/app/(dashboard)/settings/error.tsx, src/components/shared/ErrorState.tsx",
                "edit": "route handlers (garantir try/catch + console.error padronizado)",
                "read": "docs/architecture.md §7 (error handling)",
                "no_touch": "services",
                "steps": [
                    "ErrorState: ícone + mensagem + botão reset + botão Voltar",
                    "Cada error.tsx usa ErrorState com mensagem contextual",
                    "Grep src/app/api/ para conferir try/catch em todas rotas",
                ],
                "success": "erro em rota renderiza UI amigável; logs com prefixo [ROTA]",
                "partial": "boundaries ok mas algumas rotas sem try/catch",
                "error": "build falhou",
            },
            {
                "id": "F3",
                "title": "SEO + metadata + robots.txt deny",
                "complexity": "l",
                "manual": False,
                "context": "App interno: robots deny + titles por página.",
                "create": "src/app/robots.ts, src/app/sitemap.ts (vazio/minimal)",
                "edit": "src/app/layout.tsx (metadata root), principais page.tsx com metadata próprio",
                "read": "docs/PRD.md §7 (Não-funcionais — SEO)",
                "no_touch": "middleware, services",
                "steps": [
                    "robots.ts: Disallow: / (app interno)",
                    "layout.tsx root metadata: title template, description, noindex",
                    "Cada page: export const metadata = { title: '... — Bethel Motores' }",
                ],
                "success": "/robots.txt retorna Disallow: /; titles corretos",
                "partial": "robots ok, alguns titles faltando",
                "error": "build falhou",
            },
            {
                "id": "F4",
                "title": "Audit Logs UI",
                "complexity": "m",
                "manual": False,
                "context": "Admin visualiza audit_logs com filtros e diff before/after.",
                "create": "src/app/(dashboard)/settings/audit/page.tsx, src/components/settings/AuditTable.tsx, src/components/settings/AuditDetailDrawer.tsx, src/app/api/audit-logs/route.ts, src/services/audit.service.ts",
                "edit": "services críticos (mentorias, goals, user roles, funnel_templates) — chamar logAudit() após mutations",
                "read": "docs/PRD.md F16, docs/schema.md audit_logs",
                "no_touch": "role guards",
                "steps": [
                    "audit.service.ts: logAudit({ userId, action, entityType, entityId, changes }), listAudit(filters)",
                    "Page admin-only: tabela filtrável por entity_type, user, date range",
                    "Drawer mostra changes JSON diff visual",
                ],
                "success": "mutation em meta registra audit; tabela mostra entry",
                "partial": "tabela renderiza mas logAudit não chamado em todos services",
                "error": "build falhou",
            },
            {
                "id": "F5",
                "title": "Deploy Vercel + env vars",
                "complexity": "h",
                "manual": True,
                "context": "Configuração final de produção: Vercel, domínio, SMTP custom.",
                "create": "—",
                "edit": "—",
                "read": "docs/security.md §9 (checklist pre-deploy)",
                "no_touch": "—",
                "steps": [
                    "[MANUAL] Criar projeto Vercel a partir do repo GitHub",
                    "[MANUAL] Configurar env vars no Dashboard (Production + Preview): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, WEBHOOK_SECRET_FLUXON",
                    "[MANUAL] Configurar domínio custom (ex: motores.bethel.com.br)",
                    "[MANUAL] Supabase Dashboard: adicionar URL produção em Site URL e Redirect URLs",
                    "[MANUAL] Configurar SMTP custom para magic link (domínio Bethel) em Supabase → Auth → SMTP",
                    "[MANUAL] Primeiro deploy via push main",
                ],
                "success": "build prod passa; magic link funciona com domínio bethel; login produção completo",
                "partial": "deploy ok mas magic link indo pro spam",
                "error": "build prod falhou ou env vars erradas",
            },
            {
                "id": "F6",
                "title": "Checklist pre-deploy + README",
                "complexity": "m",
                "manual": False,
                "context": "README do projeto e verificação final do checklist de segurança.",
                "create": "README.md",
                "edit": "—",
                "read": "docs/security.md §9 (checklist), docs/instrucoes.md",
                "no_touch": "—",
                "steps": [
                    "README: sobre o projeto, comandos, estrutura, links para docs",
                    "Rodar cada item do checklist pre-deploy de security.md §9",
                    "Verificar: rg 'console\\.log' src/ retorna vazio (só console.error permitido)",
                    "Verificar: rg 'any' src/ --type ts retorna zero ocorrências fora de comentários",
                ],
                "success": "checklist 100%; README publicado",
                "partial": "checklist com 1-2 pendências",
                "error": "múltiplas falhas do checklist",
            },
        ],
    },
}

TEMPLATE_PATH = Path("/mnt/skills/user/capitao-america/assets/progress-template.html")
OUTPUT_PATH = Path("/home/claude/bethel-motores/docs/progress.html")

def complexity_tag(c):
    return {"l": '<span class="tg tg-l">Low</span>', "m": '<span class="tg tg-m">Medium</span>', "h": '<span class="tg tg-h">High</span>'}[c]

def build_prompt(task):
    steps = "\n".join(f"{i+1}. {s}" for i, s in enumerate(task["steps"]))
    manual_prefix = " ⚙️ MANUAL" if task["manual"] else ""
    return f"""Task {task['id']}: {task['title']}{manual_prefix}

Contexto: {task['context']}

Arquivos para CRIAR:
{task['create']}

Arquivos para EDITAR:
{task['edit']}

Arquivos para LER:
{task['read']}

NÃO TOCAR: {task['no_touch']}

Instruções:
{steps}

Ao finalizar rode npm run build e retorne EXATAMENTE uma destas frases:
✅ Sucesso — {task['success']}
⚠️ Parcial — {task['partial']}
❌ Erro — {task['error']}"""

def svg_copy():
    return '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'

def build_task_html(task):
    manual_attr = ' data-x="1"' if task["manual"] else ""
    manual_tag = '\n    <span class="tg tg-x">Manual</span>' if task["manual"] else ""
    prompt = build_prompt(task)
    complexity = complexity_tag(task["complexity"])
    return f'''
<div class="tk" data-t="{task["id"]}"{manual_attr}>
<div class="tk-row">
  <div class="tc" onclick="event.stopPropagation();K(this)"></div>
  <div class="tt" onclick="E(this)">
    <span class="tl">{task["id"]} — {task["title"]}</span>
    {complexity}{manual_tag}
  </div>
  <span class="tk-expand" onclick="E(this)">▶</span>
  <button class="cp" onclick="event.stopPropagation();C(this)">{svg_copy()}Copiar</button>
</div>
<div class="tk-prompt"><pre>{prompt}</pre>
<button class="cp cp-float" onclick="C(this)">{svg_copy()}Copiar</button>
</div>
<script type="text/plain" class="tp">{prompt}</script>
</div>
'''

def build_block_html(block_id, block):
    open_class = " o" if block["open"] else ""
    tasks_html = "\n".join(build_task_html(t) for t in block["tasks"])
    return f'''
<div class="bk" data-b="{block_id}">
<div class="bh" onclick="T(this)"><span class="bt{open_class}">▶</span><span class="bn">Bloco {block_id} — {block["name"]}</span><span class="bm" data-c="{block_id}"></span><span class="bb bb-p" data-g="{block_id}">Pendente</span></div>
<div class="bl{open_class}">
{tasks_html}
</div></div>
'''

def main():
    template = TEMPLATE_PATH.read_text()

    # Substituir placeholders
    html = (template
            .replace("__PROJECT_NAME__", PROJECT_NAME)
            .replace("__PROJECT_NAME_SLUG__", PROJECT_SLUG)
            .replace("__DATE__", DATE))

    # Encontrar conteúdo atual dentro de <div id="B"> ... </div> (com exemplos A1-A4) e substituir
    blocks_html = "\n".join(build_block_html(bid, b) for bid, b in TASKS.items())

    # Usar regex para substituir o conteúdo entre <div id="B"> e seu </div> pareado
    # Abordagem: localizar marcador NICK FURY comment até o fechamento do último bloco exemplo
    # Mais simples: replace da região entre '<div id="B">' e '<div class="ft">'
    start = html.index('<div id="B">')
    end_marker = '<div class="ft">'
    end = html.index(end_marker)

    new_html = (
        html[:start]
        + '<div id="B">\n<!-- Blocos gerados automaticamente -->\n'
        + blocks_html
        + '\n</div>\n'
        + html[end:]
    )

    OUTPUT_PATH.write_text(new_html)
    print(f"Gerado: {OUTPUT_PATH}")
    print(f"Total blocos: {len(TASKS)}")
    print(f"Total tasks: {sum(len(b['tasks']) for b in TASKS.values())}")

if __name__ == "__main__":
    main()
