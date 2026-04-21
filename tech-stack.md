> 👁️ Visão | 21/04/2026 | v1.0

# Tech Stack — Bethel Motores

## 1. Visão geral

```
┌─────────────┐   HTTPS    ┌──────────────────────┐   Postgres    ┌────────────────┐
│   Browser   │ ─────────► │   Next.js 14 (Vercel) │ ────────────► │ Supabase (PG)  │
│  (Desktop)  │            │   App Router + RSC    │               │   RLS + RPC    │
└─────────────┘ ◄───────── │   API Routes          │ ◄──────────── │   Auth + Store │
                           └──────────────────────┘                └────────────────┘
                                     │                                     ▲
                                     │ Webhooks in                          │
                                     ▼                                     │
                           ┌──────────────────────┐                        │
                           │  Fluxon / Meta Ads   │────── payload ────────┘
                           │   (externo)          │
                           └──────────────────────┘
```

- **Cliente**: Desktop-first, renderização via React Server Components + pequenas ilhas client
- **Runtime**: Next.js 14 App Router na Vercel (edge onde possível, node onde necessário)
- **Banco**: Supabase Postgres com RLS em todas as tabelas
- **Storage**: Supabase Storage para análises TXT dos posts
- **Auth**: Supabase Auth via magic link + `@supabase/ssr`
- **Integrações inbound**: endpoints em `/api/webhooks/*` protegidos por secret

---

## 2. Core stack

| Camada | Tecnologia | Versão | Justificativa |
|---|---|---|---|
| Framework | Next.js | 14+ (App Router) | RSC reduz bundle, server actions para mutations, padrão do workflow Bethel |
| Linguagem | TypeScript | 5+ strict | Type safety obrigatório — muitas entidades relacionadas |
| Estilização | Tailwind | 3+ | Zero runtime, zero CSS Modules, alinhado ao design system Bethel |
| Componentes | shadcn/ui | latest | Headless + copiável, controle total, sem lock-in |
| Banco | Supabase (Postgres) | 15+ | RLS nativo, triggers SQL, auth integrada |
| Deploy | Vercel | — | Padrão Bethel, preview por PR, zero config |
| Fontes | Plus Jakarta Sans (headings) + Inter (body) | — | Design system Bethel |
| Ícones | Lucide React | latest | Consistência visual, tree-shakeable |

### Configurações-chave

- `tsconfig.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`, alias `@/*` → `./src/*`
- `next.config.js`: `images.remotePatterns` para Supabase Storage; `experimental.serverActions` habilitado
- `tailwind.config.ts`: tokens do design system Bethel (cor primária `#1A5CE6`, acento `#F2762E` conforme design-system Bethel — confirmar com o HTML do repo na Task A2)

---

## 3. Frontend

### Estilização

- **Tailwind only**. Zero CSS Modules, zero CSS-in-JS
- Variables CSS em `globals.css` para tema (light/dark em cssvars)
- Componentes do shadcn copiados para `src/components/ui/`

### State management

| Tipo de estado | Ferramenta | Uso |
|---|---|---|
| Server state | TanStack Query 5 | Queries com cache, invalidation, optimistic updates |
| UI state local | `useState` / `useReducer` | Modais abertos, tabs, hover |
| UI state cross-component | Zustand | Filtros globais, mentoria selecionada, período do dashboard |
| Formulários | React Hook Form + Zod | Validação client (UX) + server (segurança) |
| URL state | `useSearchParams` + `useRouter` | Filtros persistentes, sharing links |

### Validação

- Schemas Zod em `src/lib/validators/*.ts`, **importados tanto pelo client quanto pelo server**
- Cada rota de API chama `schema.safeParse(body)` antes da lógica
- Forms usam `zodResolver` do `@hookform/resolvers`

---

## 4. Pacotes extras

| Pacote | Versão | Propósito | Justificativa |
|---|---|---|---|
| `@supabase/ssr` | latest | Clients server/browser + cookie session | Obrigatório para App Router; substituiu `auth-helpers` |
| `@supabase/supabase-js` | 2+ | SDK Postgres/Storage/Auth | — |
| `zustand` | 4+ | UI state global | Leve, sem boilerplate, compatível com RSC |
| `@tanstack/react-query` | 5+ | Server state | Cache granular, invalidation explícita |
| `react-hook-form` | 7+ | Forms controlados | Performance + validação desacoplada |
| `zod` | 3+ | Validação de schemas | Isomórfico client/server |
| `@hookform/resolvers` | 3+ | Integração Zod ↔ RHF | — |
| `lucide-react` | latest | Ícones | Leve, tree-shakeable |
| `framer-motion` | 11+ | Animações | Transições de drawer/modal/kanban drag |
| `@dnd-kit/core` + `@dnd-kit/sortable` | latest | Drag-and-drop kanban | Acessível, virtual scrolling compatível |
| `date-fns` | 3+ | Manipulação de datas | Locale pt-BR nativo, tree-shakeable |
| `recharts` | 2+ | Gráficos | Gráficos de linha no dashboard |
| `sonner` | 1+ | Toasts | Integração com shadcn, melhor que radix-toast |
| `next-safe-action` | latest | Server actions tipadas | Reduz boilerplate de try/catch |

**Explicitamente não incluídos:** Redux, Axios, Firebase, CSS Modules, styled-components, moment.js, lodash.

---

## 5. Infra

### Environments

| Ambiente | Domínio | Branch | Supabase Project |
|---|---|---|---|
| Dev | localhost:3000 | — | bethel-motores-dev |
| Preview | `*.vercel.app` (auto) | Qualquer PR | bethel-motores-dev |
| Prod | TBD (ex.: motores.bethel.com.br) | `main` | bethel-motores-prod |

### Env vars

```
# Public (NEXT_PUBLIC_*) - client-safe
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL

# Server only
SUPABASE_SERVICE_ROLE_KEY        # usado APENAS em webhooks + cron + admin ops
SUPABASE_JWT_SECRET              # validação de webhook
WEBHOOK_SECRET_FLUXON            # secret para validar webhook Fluxon
META_ADS_ACCESS_TOKEN            # Fase 2
META_ADS_ACCOUNT_ID              # Fase 2
```

**Regra de ouro**: service_role nunca entra no client. É referenciado apenas em `src/lib/supabase/admin.ts` que **só** é importado por arquivos dentro de `src/app/api/`.

### CI/CD

- Git push → Vercel build → preview URL em PR
- Merge em `main` → deploy prod
- Migrations: aplicadas manualmente via Supabase Dashboard SQL Editor (workflow Bethel)
- Nenhum workflow de GitHub Actions custom — Vercel nativo basta

### Monitoramento

- Vercel Analytics (Web Vitals)
- Supabase logs nativos para queries lentas
- `console.error` com prefixo `[ROTA]` que vai pro Vercel Logs
- Fase 2: avaliar Sentry (só se houver dor real)

---

## 6. Responsividade

Targets (conforme Tailwind padrão):

| Breakpoint | Largura | Comportamento |
|---|---|---|
| Base (mobile) | < 640px | Layout single-column, sidebar vira drawer, tabelas viram cards |
| `sm` | 640px+ | Ajustes tipográficos |
| `md` | 768px+ | Grid começa a aparecer |
| `lg` | 1024px+ | Sidebar fixa, grid 2-3 cols |
| `xl` | 1280px+ | **Target primário** — dashboards renderizam completos |
| `2xl` | 1536px+ | Melhor aproveitamento de espaço em telas grandes |

MVP é **desktop-first** (1280px+). Mobile recebe layout funcional mas não otimizado na v1 (tasks dedicadas em Fase 3 Polish).

---

## 7. ADRs (Architecture Decision Records)

### ADR-001 — Template de funil em vez de JSONB schemaless

**Contexto:** Funis precisam ter indicadores customizáveis.

**Opções consideradas:**
- A) Campos fixos hardcoded
- B) Template com campos definidos (FK)
- C) JSONB schemaless por funil

**Decisão:** B.

**Consequências:**
- ✅ Comparação entre mentorias continua viável
- ✅ Webhook mapping é consistente e testável
- ✅ Indexação e query por campo específico preservadas
- ⚠️ Alteração de template em uso exige cuidado com histórico (snapshots guardam `field_key` como string para sobreviver)

---

### ADR-002 — Snapshots append-only em vez de update-in-place

**Contexto:** Usuário atualiza métricas de posts e mentorias ao longo do tempo.

**Decisão:** Cada atualização cria nova linha em `*_snapshots`. Tabela "current" é uma view materializada que retorna a snapshot mais recente.

**Consequências:**
- ✅ Histórico grátis para filtros temporais e evolução
- ✅ Auditoria implícita (quem atualizou, quando)
- ⚠️ Crescimento de linhas — mitigado com índice `(entity_id, captured_at DESC)` e cleanup policy futura

---

### ADR-003 — Motor extensível via tabela

**Contexto:** Usuário pediu arquitetura para adicionar motores novos sem refactor.

**Decisão:** Tabela `motors` controla motores disponíveis + rotas dinâmicas `/motors/[slug]` + componente dispatcher que renderiza módulos baseado no slug.

**Consequências:**
- ✅ Novo motor = 1 seed + 1 pasta de componentes + 1 entry no dispatcher
- ⚠️ Módulos continuam sendo código (não podem ser criados em runtime). Trade-off consciente — runtime-configurable traria complexidade desproporcional

---

### ADR-004 — Tarefas (Kanban) standalone

**Contexto:** Bethel Gestão já tem módulo de Chamados; foi proposto integrar.

**Decisão:** Standalone no v1.

**Consequências:**
- ✅ Sem acoplamento que atrase MVP
- ✅ Schema simples de kanban
- ⚠️ Duplicação de conceito de tarefa — se integração for priorizada depois, migrar via ETL

---

### ADR-005 — `@supabase/ssr` em vez de `auth-helpers-nextjs`

**Contexto:** `auth-helpers-nextjs` foi depreciado em favor de `@supabase/ssr`.

**Decisão:** `@supabase/ssr` desde o dia 1.

**Consequências:**
- ✅ Padrão atual, sem migração futura
- ✅ Cookie handling explícito em `createServerClient`

---

### ADR-006 — Server actions + route handlers (híbrido)

**Contexto:** App Router suporta server actions e route handlers. Quando usar cada um?

**Decisão:**
- **Server actions** para mutations acionadas por forms internos (criar mentoria, atualizar snapshot)
- **Route handlers** (`/api/*`) para webhooks externos e endpoints que podem ser chamados por outros sistemas

**Consequências:**
- ✅ Menos boilerplate em mutations comuns
- ✅ Ainda há rotas REST claras para integrações
- ⚠️ Duas formas de fazer chamada — convenção documentada em `CLAUDE.md`

---

### ADR-007 — Migrations aplicadas manualmente (sem Supabase CLI no CI)

**Contexto:** Workflow Bethel já estabelece aplicar migrations manualmente via Dashboard.

**Decisão:** Manter workflow — SQL em `supabase/migrations/NNN_description.sql` mas aplicado pelo usuário no Dashboard.

**Consequências:**
- ✅ Consistência com workflow atual Bethel
- ✅ Revisão manual antes de aplicar (segurança)
- ⚠️ Risco de drift entre dev e prod — mitigado por checklist em cada task

---

## 8. Não usar (proibições explícitas)

| Não usar | Motivo |
|---|---|
| Pages Router | App Router é o padrão atual do Next.js 14+ |
| CSS Modules / styled-components | Tailwind only |
| Redux / MobX | Zustand cobre UI state; TanStack Query cobre server state |
| Axios | `fetch` nativo do Next.js tem cache + revalidate builtin |
| Firebase | Supabase é o stack escolhido |
| moment.js | `date-fns` é tree-shakeable |
| lodash (import completo) | Usar funções nativas ou imports granulares se necessário |
| `localStorage` para tokens | Cookies HTTP-only via `@supabase/ssr` |
| `useEffect` para data fetching | TanStack Query ou Server Components |
