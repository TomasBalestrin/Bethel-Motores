> 🛡️ Capitão América | 21/04/2026 | v1.0

# Instruções — Como usar esta documentação

Este documento explica o fluxo de trabalho do pacote Bethel Motores: o que é cada arquivo, a ordem de leitura, como configurar o Claude Project, e como executar as tasks sequencialmente no Claude Code.

---

## 1. O que você tem em mãos

```
bethel-motores/
├── CLAUDE.md                       # Raiz — regras de execução para Claude Code
├── docs/
│   ├── briefing.md                 # Decisões fechadas no discovery
│   ├── PRD.md                      # Product Requirements (features, user stories, APIs)
│   ├── tech-stack.md               # Pacotes, versões e ADRs
│   ├── architecture.md             # Estrutura de pastas e padrões
│   ├── schema.md                   # SQL completo (migrations 001-010)
│   ├── security.md                 # Auth, RLS, validação, headers
│   ├── ux-flows.md                 # Fluxos de tela, estados, padrões UI
│   ├── TASKS.md                    # Backlog sequencial de 36 tasks
│   ├── progress.html               # Dashboard interativo de progresso
│   └── instrucoes.md               # Este arquivo
└── gen_progress.py                 # Script que regenera progress.html
```

**Duas audiências distintas:**

| Arquivo | Quem lê |
|---|---|
| `briefing.md`, `PRD.md`, `ux-flows.md` | Bethel (você) para consulta e decisões |
| `CLAUDE.md`, `tech-stack.md`, `architecture.md`, `schema.md`, `security.md`, `TASKS.md` | Claude Code durante execução |
| `progress.html` | Bethel para tracking visual + copiar prompts |

---

## 2. Ordem de leitura (primeira vez)

1. **`briefing.md`** (5 min) — Confirmar que entendeu o escopo
2. **`PRD.md`** (15 min) — Mapear features e user stories
3. **`ux-flows.md`** (10 min) — Visualizar fluxos de tela
4. **`schema.md`** (10 min) — Conferir tabelas e RLS
5. **`TASKS.md`** (10 min) — Ver a sequência de execução
6. **`progress.html`** (abrir no navegador) — Ver como vai trackear

Total: ~50 minutos para ter domínio completo.

---

## 3. Setup do Claude Project (contexto persistente)

Esta documentação foi feita para ser colada como **contexto de Project** no Claude.ai. Assim toda conversa dentro do Project já tem os docs na base.

**Passo a passo:**

1. Abrir Claude.ai → botão "+" no canto superior → **Create Project**
2. Nome: `Bethel Motores`
3. Description: `SaaS interno modular de motores — Mentorias + Social Selling — Next.js 14 + Supabase`
4. Na seção **"Project knowledge"**, adicionar cada arquivo `.md` da pasta `docs/` + `CLAUDE.md`
5. Em **Custom instructions** (prompt persistente do Project), colar:

```
Este Project é sobre o Bethel Motores — SaaS interno da Bethel Systems com arquitetura modular de motores (Mentorias e Social Selling).

Siga ESTRITAMENTE as regras do CLAUDE.md:
- TypeScript strict, Next.js 14 App Router, Supabase com @supabase/ssr
- Máximo 200 linhas por arquivo
- Snapshots append-only em post_metrics, mentoria_metrics, funnel_metric_snapshots
- Roles: admin, gestor_trafego, gestor_infra, copy
- Sempre ler arquivo similar existente antes de criar componente/service novo

Antes de responder, consulte o doc relevante entre: PRD.md (features), schema.md (SQL), architecture.md (estrutura), security.md (auth), ux-flows.md (telas), TASKS.md (backlog).

Responda sempre em português brasileiro, técnico e direto.
```

6. Agora tudo dentro do Project usa os docs como base — você pode perguntar "Como a view v_mentorias_current calcula o percentual de comparecimento?" e o Claude vai ler diretamente de `schema.md`.

---

## 4. Workflow de execução — Claude Code

### 4.1 Preparação do repositório

Antes de rodar a primeira task (A1), você precisa do repo local vazio:

```bash
mkdir bethel-motores && cd bethel-motores
git init
```

Depois que A1 criar o Next.js, o primeiro commit acontece.

**Estrutura esperada após A1:**
```
bethel-motores/
├── src/
├── public/
├── package.json
├── tsconfig.json
└── ... arquivos do create-next-app
```

Os docs (`docs/`, `CLAUDE.md`) ficam **na raiz** do repo — isto é importante porque o Claude Code lê `CLAUDE.md` automaticamente da raiz.

### 4.2 Rodar cada task

Abra o `progress.html` em seu navegador:

1. Localize a task atual (ex: **A1 — Inicializar projeto Next.js**)
2. Clique no título para expandir
3. Clique em **Copiar**
4. No terminal, rode `claude` (Claude Code)
5. Cole o prompt e dê Enter
6. O Claude executa, cria arquivos, roda `npm run build`
7. No final retorna ✅ / ⚠️ / ❌
8. **Revise o diff antes de commitar** (regra do seu fluxo: nunca commita sem aprovação)
9. Se ✅, marque a task como concluída no `progress.html` (click no checkbox)
10. Commit: `git add . && git commit -m "feat(A1): init next.js project with deps"`
11. Próxima task

### 4.3 Interpretando os retornos

| Retorno | Ação |
|---|---|
| ✅ Sucesso | Revisar diff → commit → próxima task |
| ⚠️ Parcial | Ler descrição, decidir se resolve agora ou cria task F+1 para depois |
| ❌ Erro | Entender causa, corrigir prompt ou ambiente, rodar task de novo |

### 4.4 Tasks manuais

Duas tasks são marcadas **⚙️ MANUAL** (tag amarela no progress):
- **A4** — Aplicar schema no Supabase Dashboard
- **F5** — Deploy Vercel + env vars

Essas você executa **você mesmo**, não o Claude Code. Os passos estão detalhados no prompt.

---

## 5. Ordem recomendada

```
Fase 1 (Mentorias — Semana 1-2):
  A1 → A2 → A3 → A4(manual) → B1 → B2 → B3 → C1 → C2 → C3

Fase 1 continuação (Semana 2-3):
  D1.1 → D1.2 → D2.1 → D2.2 → D2.3 → D3
  → D4.1 → D4.2 → D5
  → D9.1 → D9.2   ← [recomendo mover para cá para testar webhook cedo]
  → D6 → D7
  → D8.1 → D8.2
  → D10 → D11 → D12

Fase 2 (Social Selling — Semana 3-4):
  E1.1 → E1.2 → E2.1 → E2.2 → E3 → E4

Fase 3 (Polish — Semana 4-5):
  F1 → F2 → F3 → F4 → F5(manual) → F6
```

**Por que D9 (webhook) vem antes de D6/D7?** Porque D7 (Disparos) já consome eventos da integração Fluxon. Sem D9 configurado, você não tem dados para testar D7.

---

## 6. Regras que você NÃO quer esquecer

Extraído do seu histórico + decisões do kickoff:

1. **SQL migrations são aplicadas manualmente** no Dashboard, nunca via CLI
2. **Credenciais (.env) vão direto para a Vercel**, nunca commitadas
3. **Nunca commitar sem aprovação humana** — regra do seu fluxo
4. **Snapshots são append-only** — nunca UPDATE em `post_metrics`, `mentoria_metrics`, `funnel_metric_snapshots`
5. **Template de funil**: `field_key` em snapshots é TEXT, não FK — sobrevive a alterações de template
6. **Campos com `source != manual`** não podem ser editados manualmente no UI
7. **Roles**: apenas `admin`, `gestor_trafego`, `gestor_infra`, `copy`
8. **Webhook Fluxon**: secret validado via bcrypt, eventos deduplicados por `source_event_id`
9. **`lib/supabase/admin.ts`** só pode ser importado em `src/app/api/**` (ESLint rule)
10. **Cards de mentoria** seguem exatamente o padrão da imagem de referência (pills + grid 2×2 + 4 barras coloridas)

---

## 7. Se algo der errado

| Situação | Ação |
|---|---|
| Task ficou ambígua | Abra conversa no Project, cole o prompt + descreva a confusão, peça versão ajustada |
| Claude Code saiu do escopo | Pare, reverta git, reabra com prompt mais restrito (exemplo: adicione "APENAS crie X, NÃO edite Y") |
| `npm run build` falha com erro estranho | `rm -rf .next node_modules && npm i && npm run build` |
| RLS bloqueia query legítima | Verifique `auth.uid()` no policy; teste a query no SQL Editor logado como o usuário |
| Magic link não chega | Dev: olhe logs do Supabase Auth; Produção: configure SMTP custom (F5) |
| Webhook retorna 401 sem razão | Confira `x-webhook-secret` no header e comparar bcrypt manualmente com o hash em `integration_sources.webhook_secret_hash` |

---

## 8. Regenerando `progress.html`

Se quiser adicionar tasks novas (ex: após um spike), edite o dict `TASKS` em `gen_progress.py` e rode:

```bash
cd bethel-motores
python3 gen_progress.py
```

O checkbox state fica em `localStorage` do navegador, então regenerar o HTML **não apaga** o progresso marcado — a menos que você mude o `data-t` (ID da task).

---

## 9. Próximos passos imediatos

```
☐ Criar repo GitHub bethel-motores (privado)
☐ Clone local + push inicial com esta pasta de docs
☐ Subir projeto Supabase bethel-motores-dev
☐ Copiar env vars para .env.local
☐ Criar Claude Project com os .md como contexto (seção 3)
☐ Abrir progress.html, copiar prompt da A1, iniciar Claude Code
```

A partir daí é só seguir o backlog. Cada task é autocontida, então você consegue pausar no fim de qualquer uma sem deixar estado inconsistente.

---

**Boa construção. 🚀**

> Se precisar revisitar alguma decisão do discovery, está tudo em `briefing.md`.
> Se precisar adicionar uma feature fora do escopo atual, crie em uma conversa nova do Project com contexto "Proposta de nova feature para Bethel Motores" e só depois promova para TASKS.md.
