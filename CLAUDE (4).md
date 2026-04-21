> ⚡ Thor | 21/04/2026 | v1.0

# CLAUDE.md — Bethel Motores

## Sobre

Plataforma modular interna de motores de crescimento da Bethel Systems — cada motor é uma frente de aquisição (Social Selling, Mentorias, …) com seus próprios módulos e métricas.

Stack: Next.js 14 (App Router) · TypeScript strict · Supabase · Tailwind · shadcn/ui · Vercel · TanStack Query 5 · Zustand · React Hook Form + Zod · `@supabase/ssr`

---

## Comandos

```bash
# Desenvolvimento
npm run dev                        # localhost:3000
npm run build                      # build de produção (rodar SEMPRE ao final de cada task)
npm run lint                       # eslint
npm run typecheck                  # tsc --noEmit

# Supabase
# Migrations NÃO rodam via CLI — aplicar manualmente pelo SQL Editor do Dashboard.
# Ordem: supabase/migrations/001_*.sql → 010_*.sql
```

---

## Estrutura do projeto (compacta)

```
src/
├── app/
│   ├── (auth)/login, callback
│   ├── (dashboard)/motors, settings, layout.tsx (sidebar+header)
│   └── api/[domínio]/route.ts
├── components/
│   ├── ui/                       # shadcn
│   ├── layout/                   # sidebar, header, breadcrumbs
│   ├── motors, social-selling, mentorias, dashboard, forms, shared/
├── hooks/                        # useMentorias, usePosts, useTasks, …
├── lib/
│   ├── supabase/                 # client.ts, server.ts, admin.ts (APENAS /api)
│   ├── validators/               # zod schemas isomórficos
│   ├── utils/                    # format, cn, calc
│   ├── auth/                     # roles, guard
│   └── integrations/             # fluxon-adapter, webhook-router
├── services/                     # mentorias.service.ts, posts.service.ts, …
├── stores/                       # zustand: periodStore, filtersStore, uiStore
├── types/                        # database.ts (gerado), domain types
└── middleware.ts                 # proteção de rotas + role gating

supabase/migrations/               # SQL numerado 001_…_010 (manual)
docs/                              # briefing, PRD, tech-stack, architecture, schema, security, ux-flows, TASKS, progress, instrucoes
```

---

## Protocolo de execução (CRÍTICO)

### §1 — Pesquisar ANTES de criar

Antes de criar um componente, service ou route handler novo:
1. Ler arquivos similares já existentes no domínio
2. Copiar padrão (nomenclatura, estrutura, imports)
3. NUNCA inventar padrão novo sem justificar

Ex: para criar `src/services/funnels.service.ts`, ler primeiro `mentorias.service.ts`.

### §2 — Escopo fechado

Toda task de Claude Code lista explicitamente:
- **CRIAR:** arquivos novos
- **EDITAR:** arquivos existentes
- **LER:** arquivos de referência
- **NÃO TOCAR:** restrições

Não tocar em arquivos fora do escopo. Se precisar editar algo não listado, perguntar antes.

### §3 — Isolamento

- 1 componente = 1 arquivo
- **Máximo 200 linhas por arquivo** — se passar, extrair sub-componente ou mover lógica para `services/` / `hooks/`
- Lógica de negócio NUNCA em `page.tsx` ou `route.ts` — sempre em `services/*.service.ts`

### §4 — Thin client, fat server

- Client components apenas capturam intenção (clicks, inputs)
- Lógica real no server (Server Component, Server Action, Route Handler, service)
- Client nunca faz query complexa direto no Supabase — usar API route ou Server Component

### §5 — Não quebrar

Ao final de **toda** task:
1. `npm run build` deve passar
2. Se editou um `type`/`interface`, verificar **todos os consumidores** com grep (`rg "MentoriaDTO" src/`)
3. Se adicionou migration, aplicar no Dashboard antes de rodar build

---

## Regras por camada

### TypeScript

- **Strict mode** sempre ativo (`tsconfig.json` com `"strict": true`, `"noUncheckedIndexedAccess": true`)
- Path alias `@/` → `./src/`
- **Zero `any`**. Se não tiver tipo, usar `unknown` + narrowing
- Interfaces para props de componente (preferir sobre `type` em props)
- Types gerados do Supabase em `src/types/database.ts` (atualizar quando schema mudar)

### React / Next.js

- **App Router** apenas (sem Pages Router)
- **Server Component é o default** — marcar `"use client"` só quando necessário
- `page.tsx` e `layout.tsx` usam **default export**; todo resto **named export**
- **Function declaration** (não arrow) para componentes
- `next/image` para TODA imagem, `next/font` para fontes, `next/dynamic` para bundles pesados (KanbanBoard, CompareGrid, charts)

### Supabase

- **3 clients distintos** em `lib/supabase/`:
  - `client.ts` — `createBrowserClient` (client components)
  - `server.ts` — `createServerClient` + cookies (RSC, route handlers, server actions)
  - `admin.ts` — `createClient` com `service_role` (**APENAS** dentro de `src/app/api/`)
- **service_role NUNCA no client** — ESLint rule bloqueia import fora de `/api`
- **RLS sempre ativo** em todas as tabelas
- Nunca fazer query complexa em client component — use Server Component ou API route

### API (route handlers)

Pipeline padrão para toda route:
```
1. try {
2.   auth: supabase.auth.getUser() → 401 se null
3.   role: assertRole(user, [...]) → 403 se falhar
4.   validate: zodSchema.safeParse(body) → 400 se falhar
5.   business: chamar service
6.   return NextResponse.json({ data }) / { error }
7. } catch (error) { console.error("[ROTA]", error); return 500 }
```

### Estilização

- **Tailwind only** — zero CSS Modules, zero CSS-in-JS
- Components do shadcn copiados em `components/ui/` (editáveis)
- **Dark mode** via CSS variables em `globals.css` (tokens do design system Bethel)
- Fontes: **Plus Jakarta Sans** (headings) + **Inter** (body) via `next/font`
- Use `cn()` de `@/lib/utils/cn` para conditional classes

### State

- **Server state** → TanStack Query 5 (`useQuery`, `useMutation`, invalidation explícita)
- **UI state local** → `useState` / `useReducer`
- **UI state global** (sidebar collapsed, filtros persistentes) → Zustand em `stores/*Store.ts`
- **Forms** → React Hook Form + `zodResolver`
- **URL state** (filtros sharebáveis) → `useSearchParams` + `router.replace`
- **NUNCA** `useEffect` para data fetching

---

## NÃO fazer

- `any` em TypeScript
- `useEffect` para data fetching
- Arquivo > 200 linhas
- Commit de `.env.local`
- `innerHTML` ou `dangerouslySetInnerHTML` com conteúdo de usuário
- Imports circulares
- `console.log` em produção (apenas `console.error` com prefixo `[ROTA]`)
- Editar arquivo fora do escopo da task
- Refatorar algo sem pedir
- Inventar padrão novo quando já existe um estabelecido
- Colocar lógica de negócio no client
- Query complexa no client component
- Mudar um `type`/`interface` sem atualizar todos os consumidores
- Importar `lib/supabase/admin.ts` fora de `src/app/api/`
- `localStorage` para tokens (cookies HTTP-only via `@supabase/ssr`)
- Cascade delete em `funnel_template_fields` (snapshots históricos ficam órfãos)
- Fazer update direto em `mentoria_metrics` / `post_metrics` / `funnel_metric_snapshots` — são append-only (sempre INSERT)

---

## Padrões de arquivo (onde colocar o quê)

| O que é | Vai em | Exemplo |
|---|---|---|
| Componente de domínio | `src/components/[domínio]/` | `src/components/mentorias/MentoriaCard.tsx` |
| Componente compartilhado | `src/components/shared/` | `EmptyState.tsx` |
| Componente de layout | `src/components/layout/` | `AppSidebar.tsx` |
| Page (Server Component default) | `src/app/(dashboard)/[path]/page.tsx` | `src/app/(dashboard)/motors/mentorias/[id]/page.tsx` |
| API route | `src/app/api/[domínio]/route.ts` | `src/app/api/mentorias/route.ts` |
| Hook | `src/hooks/use*.ts` | `useMentorias.ts` |
| Service (lógica de negócio) | `src/services/*.service.ts` | `mentorias.service.ts` |
| Validator Zod | `src/lib/validators/*.ts` | `mentoria.ts` |
| Util (funções puras) | `src/lib/utils/*.ts` | `format.ts`, `calc.ts` |
| Store Zustand | `src/stores/*Store.ts` | `periodStore.ts` |
| Types de domínio | `src/types/*.ts` | `mentoria.ts` |
| Migration SQL | `supabase/migrations/NNN_*.sql` | `004_mentorias_funnels.sql` |

---

## Convenções-chave específicas deste projeto

### Snapshots append-only

`post_metrics`, `mentoria_metrics`, `funnel_metric_snapshots` **nunca** sofrem UPDATE. Cada atualização é um INSERT novo com `captured_at = now()`. A leitura "current" usa views (`v_posts_current`, `v_mentorias_current`, `v_funnels_current_values`) ou LATERAL JOIN.

### Template de funil

Funis têm campos definidos em `funnel_template_fields` (FK). Snapshots guardam `field_key` como **TEXT (não FK)** para sobreviver a alterações de template.

Ao editar template em uso: nunca fazer cascade delete. Campos removidos ficam órfãos mas os snapshots históricos continuam válidos.

### Integrações via webhook

Toda fonte externa (Fluxon, Meta Ads, …) chega em `/api/webhooks/[sourceSlug]`, valida `x-webhook-secret` (bcrypt), salva cru em `integration_events`, e processa assíncrono via `mapping JSONB` da `integration_sources`.

### Roles

Enum: `admin | gestor_trafego | gestor_infra | copy`. Matriz completa em `docs/security.md §2`. Verificação em 3 camadas: middleware (rota) → RLS (banco) → `assertRole()` (route handler).

### Métricas da mentoria — cálculos

Percentuais exibidos nos cards de mentoria:
- Comparecimento = `leads_ao_vivo / leads_grupo × 100`
- Agendamento = `agendamentos / leads_ao_vivo × 100`
- Comparecimento Call = `calls_realizadas / agendamentos × 100`
- Conversão Call = `vendas / calls_realizadas × 100`

Fallback: 0% se denominador = 0. Calculados na view `v_mentorias_current` e replicados em `lib/utils/calc.ts` para o client.

### Server Actions vs Route Handlers

| Use Server Action | Use Route Handler (`/api`) |
|---|---|
| Mutation acionada por form interno | Webhook externo (Fluxon) |
| Fluxo 100% dentro do app | Endpoint consumido por outro sistema |
| Ex: criar mentoria, salvar snapshot | Ex: `/api/webhooks/fluxon` |

---

## Docs disponíveis

Leia em ordem ao iniciar uma task complexa:

| Doc | Quando ler |
|---|---|
| `docs/briefing.md` | Contexto geral, decisões fechadas |
| `docs/PRD.md` | Detalhes de feature, user stories, API routes |
| `docs/tech-stack.md` | Escolhas de pacote e ADRs |
| `docs/architecture.md` | Estrutura de pastas, nomenclatura, padrões |
| `docs/schema.md` | SQL, enums, RLS, views, seed |
| `docs/security.md` | Auth, permissões, validação |
| `docs/ux-flows.md` | Fluxos de tela, estados, padrões de interação |
| `docs/TASKS.md` | Lista sequencial de tasks (este é seu backlog) |

---

## Fluxo de uma task

1. Abrir `docs/TASKS.md` e localizar a task
2. Ler doc(s) referenciados em **LER**
3. Listar mentalmente os arquivos de CRIAR/EDITAR
4. Escrever código seguindo padrões dos arquivos LER
5. `npm run build`
6. Se passou → retornar `✅ Sucesso — [critério]`
7. Se build quebrou → consertar ou retornar `⚠️ Parcial / ❌ Erro` com descrição
