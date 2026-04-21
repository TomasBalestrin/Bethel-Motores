> 🏹 Gavião Arqueiro | 21/04/2026 | v1.0

# Security — Bethel Motores

## 1. Auth

### 1.1 Método

**Supabase Auth com magic link.** Nenhuma senha armazenada. Fluxo:

1. Usuário digita email em `/login`
2. Server action chama `supabase.auth.signInWithOtp({ email })` com `emailRedirectTo: NEXT_PUBLIC_APP_URL + '/auth/callback'`
3. Email chega com link de uso único
4. Click no link → `/auth/callback?code=...` troca o code por sessão
5. Cookies HTTP-only são setados via `@supabase/ssr`
6. Middleware refresca token a cada request

### 1.2 Cookies

- **HTTP-only**: JavaScript no browser não consegue ler (protege contra XSS)
- **Secure**: só via HTTPS em prod
- **SameSite=Lax**: proteção CSRF básica
- **Nunca usar `localStorage` ou `sessionStorage`** para tokens

### 1.3 Clientes Supabase

| Cliente | Onde usa | Cookies | service_role? |
|---|---|---|---|
| `createClient()` de `lib/supabase/client.ts` | Client Components, stores | Sim, automáticos | Não |
| `createClient()` de `lib/supabase/server.ts` | Server Components, Route Handlers, Server Actions | Sim, via `cookies()` | Não |
| `createAdminClient()` de `lib/supabase/admin.ts` | APENAS webhooks e endpoints administrativos em `/api` | — | **Sim — nunca no client-reachable** |

### 1.4 Middleware (`src/middleware.ts`)

```ts
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

A função `updateSession` em `lib/supabase/middleware.ts`:
1. Cria `createServerClient` com hooks de cookie
2. Chama `supabase.auth.getUser()`
3. Se não autenticado e rota privada → redirect `/login`
4. Se autenticado e rota auth (`/login`) → redirect `/motors`
5. Role gating para rotas sensíveis (`/settings/users`, `/settings/integrations`)

---

## 2. Autorização em 3 camadas

Toda operação sensível passa por **três** camadas independentes. Se uma falhar, as outras seguram.

### Camada 1 — Middleware (rota)

Bloqueia entrada em rotas antes mesmo do render:

```ts
// pseudo-código dentro de updateSession()
const ADMIN_ROUTES = ['/settings/users', '/settings/integrations', '/settings/audit']
const INFRA_ROUTES = ['/settings/funnel-templates', '/settings/integrations']

if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && profile.role !== 'admin') {
  return NextResponse.redirect(new URL('/motors', request.url))
}
```

### Camada 2 — RLS no Postgres

Policies em todas as tabelas (ver `schema.md` §9). Mesmo que middleware falhe, o banco bloqueia. Helper functions:

- `current_user_role()` — retorna a role do `auth.uid()`
- `is_admin()` — boolean
- `has_role(ARRAY[...])` — checa se a role do user está na lista

### Camada 3 — Route Handlers e Server Actions

Antes de qualquer operação em `/api` ou server action, chamar `assertRole`:

```ts
// src/lib/auth/guard.ts
export async function assertRole(
  supabase: SupabaseClient,
  userId: string,
  allowedRoles: UserRole[]
): Promise<{ ok: boolean; error?: string }> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('id', userId)
    .single()

  if (!profile || !profile.is_active) return { ok: false, error: 'Usuário inativo' }
  if (!allowedRoles.includes(profile.role)) return { ok: false, error: 'Permissão insuficiente' }
  return { ok: true }
}
```

### Matriz de permissões canônica

| Recurso | Admin | Tráfego | Infra | Copy | Fonte da verdade |
|---|---|---|---|---|---|
| Motors | CRUD | R | R | R | RLS `motors_admin_write` |
| Social Profiles | CRUD | R | CRUD | R | RLS + middleware `/settings` |
| Motor Dashboard Cards | CRUD | R | R | R | RLS |
| Posts | CRUD | CRUD | R | R | RLS + guard `/api/posts` |
| Post Metrics | CRUD | CRUD | R | R | RLS |
| Post Analyses | CRUD | CRUD | R | CRUD | RLS |
| Tasks | CRUD | CRUD | CRUD | CRUD | RLS (autenticado) |
| Mentorias | CRUD | CRUD | R | R | RLS + guard |
| Mentoria Metrics | CRUD | CRUD | R | R | RLS |
| Funnel Templates | CRUD | R | CRUD | R | RLS + middleware |
| Funnels | CRUD | CRUD | CRUD | R | RLS |
| Funnel Snapshots | INSERT | INSERT | INSERT | R | RLS (insert-only) |
| Integration Sources | CRUD | R | CRUD | — | RLS + middleware `/settings/integrations` |
| Goals | CRUD | R | R | R | RLS + guard |
| Users / Invites | CRUD | — | — | — | RLS + middleware `/settings/users` |
| Audit Logs | R | — | — | — | RLS |

---

## 3. Validação

### 3.1 Zod em TUDO

Toda entrada (body, searchParams, formData) passa por Zod antes de tocar o banco.

```ts
// src/lib/validators/mentoria.ts
import { z } from 'zod'

export const mentoriaCreateSchema = z.object({
  name: z.string().min(3).max(120),
  scheduled_at: z.string().datetime(),
  specialist_id: z.string().uuid(),
  traffic_budget: z.number().nonnegative().optional().nullable(),
})

export type MentoriaCreate = z.infer<typeof mentoriaCreateSchema>
```

Client (UX — feedback rápido):
```tsx
const form = useForm<MentoriaCreate>({ resolver: zodResolver(mentoriaCreateSchema) })
```

Server (segurança — não confia no client):
```ts
const parsed = mentoriaCreateSchema.safeParse(body)
if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
```

### 3.2 Limites de input

| Campo | Limite |
|---|---|
| String curta (nome, código de post) | 3-120 chars |
| String média (descrição, observação) | 0-2000 chars |
| String longa (content_text de análise) | 0-50000 chars |
| URLs | 2048 chars, schema válido |
| Números inteiros (métricas) | 0 a 2^31 |
| Valores monetários | NUMERIC(14,2), 0 a 999.999.999.999,99 |

### 3.3 Sanitização

- **HTML**: todo `content_text` de análise é renderizado com `react-markdown` com plugins seguros (sem `rehype-raw` que permite HTML inline). Nenhum `dangerouslySetInnerHTML` com conteúdo de usuário.
- **URLs**: valida com Zod `.url()` + aceita apenas `https://` ou `http://` (não `javascript:`, `data:`, etc.)

---

## 4. API security

### 4.1 CORS

- Produção: `Access-Control-Allow-Origin: motores.bethel.com.br` (único)
- Dev: `Access-Control-Allow-Origin: http://localhost:3000`
- Webhooks (`/api/webhooks/*`): CORS desabilitado (chamada server-to-server com secret)

Configuração em `next.config.js`:

```js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
```

### 4.2 Rate limiting

Via Vercel Edge Config + middleware (implementação simples em memória com Upstash Redis na Fase 3):

| Endpoint | Limite |
|---|---|
| `/login` (magic link) | 5 / min por IP |
| `/api/*` geral | 60 / min por usuário |
| `/api/webhooks/*` | 300 / min por source (Fluxon pode ter volume alto) |
| `/api/posts/[id]/analyses` upload | 10 / min por usuário |

Fase 1: rate limit simples em memória (resetado em cada deploy). Fase 3: Upstash Redis para persistência.

### 4.3 Security headers

`next.config.js`:

```js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel.live; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https://*.supabase.co https://*.supabase.in; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
        },
      ],
    },
  ]
}
```

### 4.4 Webhook auth (Fluxon e genérico)

Cada `integration_source` tem um `webhook_secret_hash` (bcrypt do secret). Secret bruto é mostrado uma única vez na UI quando criado.

Fluxo do webhook:

```ts
// src/app/api/webhooks/[sourceSlug]/route.ts
export async function POST(request: Request, { params }: { params: { sourceSlug: string } }) {
  const secret = request.headers.get('x-webhook-secret')
  if (!secret) return NextResponse.json({ error: 'Missing secret' }, { status: 401 })

  const admin = createAdminClient()
  const { data: source } = await admin
    .from('integration_sources')
    .select('id, webhook_secret_hash, is_active, mapping, slug')
    .eq('slug', params.sourceSlug)
    .eq('is_active', true)
    .single()

  if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })

  const valid = await bcrypt.compare(secret, source.webhook_secret_hash)
  if (!valid) return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })

  // Salvar payload cru + processar async
  const payload = await request.json()
  // ...
}
```

---

## 5. Env vars

### 5.1 Categorização

**Públicas (`NEXT_PUBLIC_*`)** — expostas no bundle client, não-sensíveis:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (com RLS, é segura de expor)
- `NEXT_PUBLIC_APP_URL`

**Server only** — nunca importadas por arquivos com `"use client"`:
- `SUPABASE_SERVICE_ROLE_KEY` — bypass completo de RLS, apenas em `/api`
- `SUPABASE_JWT_SECRET` — validação interna
- `META_ADS_ACCESS_TOKEN` (Fase 2)
- `META_ADS_ACCOUNT_ID` (Fase 2)

### 5.2 Regras

- `.env.local` nunca commitado — `.gitignore` inclui linha explícita
- `.env.local.example` commitado com nomes de variáveis e comentários (sem valores)
- Configuração em Vercel via Dashboard (padrão Bethel)
- Secrets rotacionados a cada incidente ou trimestralmente

### 5.3 Linter de imports

Configurar ESLint rule custom:

```json
// .eslintrc.json (excerto)
"no-restricted-imports": ["error", {
  "patterns": [
    {
      "group": ["@/lib/supabase/admin"],
      "message": "admin.ts só pode ser importado em arquivos dentro de src/app/api/"
    }
  ]
}]
```

Com override para `src/app/api/**/*.ts` permitindo o import.

---

## 6. Dados e LGPD

### 6.1 PII armazenado

| Campo | Tabela | Sensibilidade | Retenção |
|---|---|---|---|
| `email` | `user_profiles`, `auth.users` | Identificador | Até desativação do usuário + 90 dias |
| `name` | `user_profiles` | Identificador | Idem |
| Nome de mentoria | `mentorias.name` | Baixa (operacional) | Indefinida |
| Análise de post (texto/arquivo) | `post_analyses` | Potencialmente sensível | Indefinida; deletável pelo criador |

### 6.2 Sem dados de cliente externo

O sistema é interno — **não armazena** dados de leads, mentorados ou clientes finais. Apenas métricas agregadas (contagens, valores). Se leads individuais forem adicionados no futuro (ex: lista de participantes de mentoria), reavaliar LGPD.

### 6.3 Direitos LGPD (usuários internos)

- Export: botão em `/settings/profile` que baixa JSON com todos os dados do usuário
- Delete: botão em `/settings/profile` que dispara soft delete de `user_profiles` (anonimização: email → `deleted-{id}@bethel.local`, name → `Usuário deletado`)

### 6.4 Soft delete

Todas as tabelas com `deleted_at` filtram em policies e queries. Nunca hard delete via UI. Hard delete apenas via SQL admin (jamais em produção sem aprovação).

---

## 7. Upload de arquivos (análises de post)

### 7.1 Validação

| Check | Onde |
|---|---|
| MIME type `text/plain` | Bucket config (`allowed_mime_types`) + validação client |
| Tamanho ≤ 5MB | Bucket config (`file_size_limit`) + validação client |
| Nome sanitizado | `slugify(filename)` antes de upload |
| Path único | `{post_id}/{uuid}.txt` |

### 7.2 Fluxo seguro

1. Client valida MIME + size antes de enviar
2. Client faz upload direto ao Supabase Storage (não passa pelo server) usando client authenticated
3. Storage RLS verifica `auth.uid()` e bucket permission
4. Server grava linha em `post_analyses` com `file_url` apontando para o path

---

## 8. Logs e observabilidade

### 8.1 O que logar

- **Sim:** `console.error("[ROTA]", error.message, { userId, entityId })` em route handlers
- **Sim:** eventos de auditoria (mudanças críticas) via trigger Postgres → `audit_logs`
- **Não:** `console.log` em produção — ESLint rule `no-console` ativada com exceção para `error`

### 8.2 O que não logar

- Senhas (não existem)
- Tokens JWT
- Secrets de webhook
- Conteúdo completo de uploads
- Email completo em logs de erro (mascarar: `user***@domain.com`)

---

## 9. Checklist pre-deploy

Checklist obrigatório antes de cada deploy em produção:

- [ ] RLS habilitado em todas as tabelas (query de verificação: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN (SELECT tablename FROM pg_tables WHERE rowsecurity=true)`)
- [ ] Nenhum import de `@/lib/supabase/admin` fora de `src/app/api/*`
- [ ] Todos os route handlers têm try/catch
- [ ] Todas as mutations têm validação Zod server-side
- [ ] `.env.local` não commitado; vars configuradas em Vercel (dev/preview/prod)
- [ ] CORS restrito ao domínio de produção
- [ ] Security headers aplicados (X-Frame-Options, CSP, etc.)
- [ ] Rate limiting ativo em `/api/webhooks/*` e `/login`
- [ ] Middleware bloqueia `/settings/users` e `/settings/integrations` para não-admin
- [ ] Uploads validam MIME + size no client e no bucket
- [ ] Errors genéricos no response (sem stack trace vazando)
- [ ] Sem `console.log` restante no código (apenas `console.error`)
- [ ] `.gitignore` inclui `.env.local`, `.env*.local`, `node_modules`
- [ ] Magic link SMTP customizado configurado (domínio bethel) — evita spam

---

## 10. Matriz de risco de segurança

| Ameaça | Probabilidade | Impacto | Mitigação principal |
|---|---|---|---|
| Vazamento de service_role | Baixa | Crítico | Import isolado + ESLint rule + code review |
| RLS esquecido em nova tabela | Média | Alto | Checklist pre-deploy + migration template exige `ENABLE RLS` |
| XSS via análise de post | Baixa | Médio | `react-markdown` sem `rehype-raw`; sanitização |
| CSRF | Baixa | Médio | `SameSite=Lax` nos cookies + server actions com origin check |
| Webhook sem secret | Média | Alto | Validação `x-webhook-secret` + bcrypt no banco |
| Magic link interceptado | Baixa | Alto | HTTPS obrigatório + expiração 10min |
| Role escalation (user se promove) | Baixa | Crítico | RLS bloqueia UPDATE de `role` (policy `profiles_self_update` exclui `role`) + audit log |
| Upload malicioso (não-TXT) | Média | Médio | Bucket `allowed_mime_types` + validação dupla |
| SQL injection | Baixa | Crítico | ORM do Supabase parametriza tudo — nunca string concat em query |
| DoS em webhook | Média | Médio | Rate limit + payload size limit no Next.js |
