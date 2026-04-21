> 🧙 Doutor Estranho | 21/04/2026 | v1.0

# Architecture — Bethel Motores

## 1. Estrutura de diretórios

```
bethel-motores/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                 # sidebar + header
│   │   │   ├── motors/
│   │   │   │   ├── page.tsx               # seleção de motor
│   │   │   │   ├── mentorias/
│   │   │   │   │   ├── page.tsx           # dashboard motor
│   │   │   │   │   ├── listagem/
│   │   │   │   │   │   └── page.tsx       # lista mentorias
│   │   │   │   │   ├── comparar/
│   │   │   │   │   │   └── page.tsx       # módulo comparar
│   │   │   │   │   └── [mentoriaId]/
│   │   │   │   │       ├── page.tsx       # dashboard mentoria
│   │   │   │   │       ├── trafego/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       └── disparos/
│   │   │   │   │           └── page.tsx
│   │   │   │   └── social-selling/
│   │   │   │       ├── page.tsx           # seleção perfil
│   │   │   │       └── [profileSlug]/
│   │   │   │           ├── page.tsx       # dashboard perfil
│   │   │   │           ├── criativos/
│   │   │   │           │   └── page.tsx
│   │   │   │           └── tarefas/
│   │   │   │               └── page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx               # hub de settings
│   │   │       ├── users/
│   │   │       │   └── page.tsx
│   │   │       ├── integrations/
│   │   │       │   └── page.tsx
│   │   │       ├── funnel-templates/
│   │   │       │   └── page.tsx
│   │   │       └── goals/
│   │   │           └── page.tsx
│   │   ├── api/
│   │   │   ├── motors/
│   │   │   │   └── route.ts
│   │   │   ├── social-profiles/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── posts/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── metrics/
│   │   │   │       │   └── route.ts
│   │   │   │       └── analyses/
│   │   │   │           └── route.ts
│   │   │   ├── mentorias/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── metrics/
│   │   │   │       │   └── route.ts
│   │   │   │       └── funnels/
│   │   │   │           └── route.ts
│   │   │   ├── funnels/
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── snapshot/
│   │   │   │       │   └── route.ts
│   │   │   │       └── history/
│   │   │   │           └── route.ts
│   │   │   ├── funnel-templates/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── tasks/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── compare/
│   │   │   │   └── route.ts
│   │   │   ├── goals/
│   │   │   │   └── route.ts
│   │   │   ├── users/
│   │   │   │   ├── route.ts
│   │   │   │   ├── invite/
│   │   │   │   │   └── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── integrations/
│   │   │   │   ├── sources/
│   │   │   │   │   └── route.ts
│   │   │   │   └── events/
│   │   │   │       └── [id]/
│   │   │   │           └── reprocess/
│   │   │   │               └── route.ts
│   │   │   └── webhooks/
│   │   │       └── [sourceSlug]/
│   │   │           └── route.ts
│   │   ├── layout.tsx                     # root layout
│   │   ├── page.tsx                       # landing (redirect /motors se logado)
│   │   ├── globals.css
│   │   └── error.tsx
│   ├── components/
│   │   ├── ui/                            # shadcn copiado
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── AppHeader.tsx
│   │   │   ├── Breadcrumbs.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── motors/
│   │   │   ├── MotorCard.tsx
│   │   │   └── MotorSelector.tsx
│   │   ├── social-selling/
│   │   │   ├── ProfileCard.tsx
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostRow.tsx
│   │   │   ├── PostMetricsDrawer.tsx
│   │   │   ├── PostAnalysisDrawer.tsx
│   │   │   └── KanbanBoard.tsx
│   │   ├── mentorias/
│   │   │   ├── MentoriaCard.tsx
│   │   │   ├── MentoriaForm.tsx
│   │   │   ├── MentoriaFilters.tsx
│   │   │   ├── FunnelCard.tsx
│   │   │   ├── FunnelAddModal.tsx
│   │   │   ├── FunnelTemplateEditor.tsx
│   │   │   └── CompareGrid.tsx
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── PeriodFilter.tsx
│   │   │   └── GoalProgress.tsx
│   │   ├── forms/
│   │   │   ├── FormField.tsx
│   │   │   └── FormError.tsx
│   │   └── shared/
│   │       ├── EmptyState.tsx
│   │       ├── LoadingState.tsx
│   │       └── ConfirmDialog.tsx
│   ├── hooks/
│   │   ├── useUser.ts                     # TanStack Query de user_profile
│   │   ├── useMotor.ts
│   │   ├── useMentorias.ts
│   │   ├── usePosts.ts
│   │   ├── useFunnels.ts
│   │   ├── useTasks.ts
│   │   ├── useGoals.ts
│   │   └── useDebounce.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                  # createBrowserClient
│   │   │   ├── server.ts                  # createServerClient (RSC/actions)
│   │   │   ├── admin.ts                   # service_role — SÓ em /api
│   │   │   └── middleware.ts              # refresh de cookie
│   │   ├── validators/
│   │   │   ├── motor.ts
│   │   │   ├── social.ts
│   │   │   ├── mentoria.ts
│   │   │   ├── funnel.ts
│   │   │   ├── task.ts
│   │   │   ├── integration.ts
│   │   │   └── common.ts
│   │   ├── utils/
│   │   │   ├── cn.ts                      # clsx + tailwind-merge
│   │   │   ├── format.ts                  # formatCurrency, formatPercent, formatDate
│   │   │   ├── calc.ts                    # cálculos de métricas (comparecimento, etc.)
│   │   │   └── slugify.ts
│   │   ├── auth/
│   │   │   ├── roles.ts                   # roles + permissions map
│   │   │   └── guard.ts                   # assertRole helper
│   │   └── integrations/
│   │       ├── webhook-router.ts          # dispatcher inbound
│   │       ├── fluxon-adapter.ts
│   │       └── meta-ads-adapter.ts        # Fase 2
│   ├── services/
│   │   ├── motors.service.ts
│   │   ├── social-profiles.service.ts
│   │   ├── posts.service.ts
│   │   ├── mentorias.service.ts
│   │   ├── funnels.service.ts
│   │   ├── tasks.service.ts
│   │   ├── goals.service.ts
│   │   ├── users.service.ts
│   │   └── integrations.service.ts
│   ├── stores/
│   │   ├── periodStore.ts                 # filtro de período global
│   │   ├── filtersStore.ts
│   │   └── uiStore.ts                     # sidebar collapsed, modais
│   ├── types/
│   │   ├── database.ts                    # gerado pelo Supabase CLI
│   │   ├── motor.ts
│   │   ├── mentoria.ts
│   │   ├── funnel.ts
│   │   ├── post.ts
│   │   ├── task.ts
│   │   └── common.ts
│   └── middleware.ts                      # proteção de rotas + role gating
├── supabase/
│   └── migrations/
│       ├── 001_extensions_enums.sql
│       ├── 002_core_tables.sql
│       ├── 003_social_selling.sql
│       ├── 004_mentorias_funnels.sql
│       ├── 005_integrations.sql
│       ├── 006_goals_audit.sql
│       ├── 007_rls_policies.sql
│       ├── 008_triggers.sql
│       ├── 009_views.sql
│       └── 010_seed.sql
├── public/
│   └── favicon.ico
├── docs/
│   ├── briefing.md
│   ├── PRD.md
│   ├── tech-stack.md
│   ├── architecture.md
│   ├── schema.md
│   ├── security.md
│   ├── ux-flows.md
│   ├── TASKS.md
│   ├── progress.html
│   └── instrucoes.md
├── CLAUDE.md
├── README.md
├── .env.local.example
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. Nomenclatura

| Elemento | Padrão | Exemplo |
|---|---|---|
| Componente (arquivo) | PascalCase.tsx | `MentoriaCard.tsx` |
| Util (arquivo) | camelCase.ts | `formatCurrency.ts` |
| Hook | `use*.ts` | `useMentorias.ts` |
| Store (Zustand) | `*Store.ts` | `periodStore.ts` |
| Service | `*.service.ts` | `mentorias.service.ts` |
| Pasta | kebab-case | `social-selling/` |
| Variável | camelCase | `totalInvestment` |
| Tipo / Interface | PascalCase | `MentoriaDTO` |
| Constante | UPPER_SNAKE | `MAX_COMPARE_ITEMS` |
| Env pública | `NEXT_PUBLIC_*` | `NEXT_PUBLIC_APP_URL` |
| Tabela Postgres | snake_case plural | `funnel_metric_snapshots` |
| Coluna Postgres | snake_case | `captured_at` |
| Enum Postgres | snake_case singular | `user_role` |
| Migration | `NNN_description.sql` | `003_social_selling.sql` |

---

## 3. Componentes

### Padrões

- **Function declaration** (não arrow) — `export function MentoriaCard() {}`
- **Named export** para tudo, exceto `page.tsx` e `layout.tsx` (default obrigatório)
- **"use client"** só quando o componente usa hooks, eventos do browser ou state client
- **Server Component é o default** — não marcar como client sem necessidade
- **Props tipadas com interface inline** no mesmo arquivo
- **Máximo 200 linhas por arquivo** — se passar, extrair sub-componentes ou lógica para hooks/services

### Template

```tsx
// src/components/mentorias/MentoriaCard.tsx
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils/format'
import type { MentoriaWithMetrics } from '@/types/mentoria'

interface MentoriaCardProps {
  mentoria: MentoriaWithMetrics
  onClick?: () => void
}

export function MentoriaCard({ mentoria, onClick }: MentoriaCardProps) {
  // ...
}
```

### Client components: regras de uso

Marcar `"use client"` apenas quando:
- Precisa de `useState`, `useEffect`, `useRef`, `useMemo`
- Usa event handlers (`onClick`, `onChange`, `onSubmit`)
- Usa libs client-only (`framer-motion`, `@dnd-kit`)
- Consome hooks do Zustand ou TanStack Query

---

## 4. API pattern

Toda rota em `src/app/api/*/route.ts` segue o pipeline:

```
1. Parse request (método, body, searchParams)
2. Auth check          → createServerClient + supabase.auth.getUser()
3. Role check          → assertRole(user, ['admin', 'gestor_trafego'])
4. Zod validation      → schema.safeParse(body)
5. Business logic      → chamar service
6. Response            → { data } ou { error }
```

### Template

```ts
// src/app/api/mentorias/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertRole } from '@/lib/auth/guard'
import { mentoriaCreateSchema } from '@/lib/validators/mentoria'
import { createMentoria, listMentorias } from '@/services/mentorias.service'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const data = await listMentorias(supabase, {
      status: searchParams.get('status'),
      query: searchParams.get('query'),
    })
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/mentorias]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const roleCheck = await assertRole(supabase, user.id, ['admin', 'gestor_trafego'])
    if (!roleCheck.ok) return NextResponse.json({ error: roleCheck.error }, { status: 403 })

    const body = await request.json()
    const parsed = mentoriaCreateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const mentoria = await createMentoria(supabase, parsed.data, user.id)
    return NextResponse.json({ data: mentoria }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/mentorias]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

### Status codes

| Código | Cenário |
|---|---|
| 200 | OK (GET, PATCH) |
| 201 | Created (POST bem sucedido) |
| 204 | No Content (DELETE) |
| 400 | Validação Zod falhou |
| 401 | Sem autenticação |
| 403 | Autenticado mas sem role / RLS bloqueou |
| 404 | Entidade não encontrada |
| 422 | Regra de negócio violada (ex: duplicata) |
| 429 | Rate limit |
| 500 | Erro inesperado |

---

## 5. Supabase

### Client / Server / Admin

```ts
// src/lib/supabase/client.ts — USAR EM CLIENT COMPONENTS
'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```ts
// src/lib/supabase/server.ts — USAR EM RSC E ROUTE HANDLERS
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component — ignorar */ }
        },
      },
    }
  )
}
```

```ts
// src/lib/supabase/admin.ts — APENAS DENTRO DE /api
import { createClient as createSbClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

### Regras rígidas

- **`admin.ts` nunca é importado em arquivos fora de `src/app/api/`** — linter / code review
- **RLS sempre ativo** em todas as tabelas (`ENABLE ROW LEVEL SECURITY`)
- **Nunca fazer query complexa no client** — usar Server Component ou API route

---

## 6. Data fetching

| Contexto | Técnica |
|---|---|
| Listagem estática inicial | Server Component + Supabase direto |
| Listagem com filtros interativos | Server Component busca initial + TanStack Query continua a partir dali |
| Mutação com form | Server action + revalidação |
| Mutação com UI reativa | TanStack Query mutation + optimistic update |
| Webhook inbound | API route + service |
| **Nunca** | `useEffect` para data fetching |

### Template: Server Component com initial + TanStack Query

```tsx
// src/app/(dashboard)/motors/mentorias/listagem/page.tsx
import { createClient } from '@/lib/supabase/server'
import { listMentorias } from '@/services/mentorias.service'
import { MentoriasListClient } from '@/components/mentorias/MentoriasListClient'

export default async function MentoriasListagem() {
  const supabase = await createClient()
  const mentorias = await listMentorias(supabase, {})
  return <MentoriasListClient initialData={mentorias} />
}
```

---

## 7. Error handling

### Client

- **`error.tsx`** em cada segmento crítico (`/motors/mentorias/[id]/error.tsx`)
- Toast de erro em mutations (via `sonner`)
- Form errors inline abaixo do campo

### Server

- Todo route handler tem try/catch
- `console.error("[ROTA]", error)` — Vercel captura
- Retorno sempre `{ error: "mensagem amigável" }` — stack trace nunca vaza pro client
- Erros de negócio 422 com mensagem específica; erros inesperados 500 com mensagem genérica

### Template `error.tsx`

```tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8 text-center">
      <h2>Algo deu errado</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset}>Tentar novamente</button>
    </div>
  )
}
```

---

## 8. Performance

### Otimizações obrigatórias

- `next/image` para toda imagem (avatars, logos) — inclusive de Supabase Storage (configurar `remotePatterns`)
- `next/font` para Plus Jakarta Sans + Inter em `app/layout.tsx`
- `next/dynamic` para KanbanBoard, CompareGrid, charts (Recharts) — reduz bundle inicial
- `<Suspense>` em Server Components lentos com skeleton fallback
- Parallel fetch: `Promise.all` quando múltiplas queries independentes

### Índices críticos (ver schema.md)

- `posts (social_profile_id, is_active, deleted_at)` — listagem do dashboard
- `post_metrics (post_id, captured_at DESC)` — snapshot mais recente
- `mentoria_metrics (mentoria_id, captured_at DESC)` — idem
- `funnel_metric_snapshots (funnel_id, field_key, captured_at DESC)` — histórico e current
- `tasks (social_profile_id, status, position)` — kanban render

### Views materializadas (consideradas na Fase 3)

- `v_posts_current_metrics` — última snapshot por post
- `v_mentorias_current_metrics` — última snapshot por mentoria
- `v_funnels_current` — último valor por campo de funil

MVP usa views simples (não materializadas) com LATERAL JOIN. Materializar só se houver lentidão real.

---

## 9. Anti-patterns a evitar

| Anti-pattern | Padrão correto |
|---|---|
| `useEffect(() => fetch('/api/...'), [])` | TanStack Query ou Server Component |
| Importar `admin.ts` fora de `/api` | service_role NUNCA no client-reachable |
| Query Supabase em client component complexo | Server Component + props |
| `any` em tipo | Tipo explícito ou `unknown` com narrowing |
| Component > 200 linhas | Extrair para sub-component ou hook |
| Lógica de negócio em `page.tsx` | Mover para `services/*.service.ts` |
| Hardcode de role check | `assertRole()` helper |
| Componente que recebe tudo como `any` | Interface tipada |
