> 🔴 Iron Man | 21/04/2026 | v1.0

# PRD — Bethel Motores

## 1. Visão

### 1.1 Problema

A operação de aquisição da Bethel Systems roda em dois motores principais que hoje vivem em sistemas fragmentados: **Social Selling** (impulsionamento pago de posts orgânicos com os especialistas Cleiton e Julia) e **Mentorias** (eventos high-ticket ao vivo com funil de conversão). Planilhas, Meta Business Manager, Fluxon (disparos), e CRMs soltos geram três dores:

1. **Não existe visão única de investimento × resultado** por motor, mês ou mentoria específica
2. **Comparar performance entre mentorias** é trabalho manual recorrente
3. **Rastrear o ciclo completo de um post impulsionado** (cadastro → investimento → seguidores → análise → fit) exige consultar três ferramentas diferentes

### 1.2 Solução

Plataforma modular com arquitetura de "motores" — cada motor é uma frente de aquisição com seus próprios módulos, métricas e indicadores. Usuário seleciona o motor após login e entra na interface específica. Arquitetura aberta para adicionar novos motores sem refactor (ex.: Lançamentos, Eventos, Parcerias).

### 1.3 Personas

| Persona | Objetivo primário | Objetivo secundário |
|---|---|---|
| Admin | Controle total da operação | Configurar metas e usuários |
| Gestor de Tráfego | Lançar investimentos e acompanhar ROI | Cadastrar mentorias e posts |
| Gestor de Infraestrutura | Configurar integrações e templates | Garantir que dados cheguem |
| Copy | Registrar análise de criativos e marcar fit | Observações estratégicas |

### 1.4 KPIs de sucesso

| KPI | Target 30 dias | Target 90 dias |
|---|---|---|
| Adoção interna (usuários ativos semanais) | 4/4 roles | 6+ usuários |
| Mentorias cadastradas antes de acontecer | 100% | 100% |
| Posts impulsionados com análise anexada | ≥ 70% | ≥ 90% |
| Tempo médio para criar nova mentoria (UX) | < 45s | < 30s |
| Queries sem cache < 300ms | 80% | 95% |

---

## 2. Features

Legenda: **P0** = MVP obrigatório · **P1** = próxima fase · **P2** = backlog

### F1 — Seleção de motor (P0)

**Descrição:** Tela home após login lista os motores disponíveis como cards grandes. Usuário seleciona um motor e é redirecionado para sua interface dedicada.

**User story:** Como qualquer usuário, quero selecionar o motor que vou trabalhar para ver apenas a operação daquela frente.

**Critérios de aceitação:**
- [ ] `/motors` lista todos os `motors` com `is_active=true` ordenados por `display_order`
- [ ] Cada card mostra ícone + nome + descrição curta + contador de itens ativos
- [ ] Click em card redireciona para `/motors/[slug]` (ex.: `/motors/mentorias`)
- [ ] Breadcrumb permite voltar para `/motors` em qualquer interface interna
- [ ] Motores inativos não aparecem para não-admins
- [ ] Usuário sem acesso a nenhum motor vê empty state + CTA para contatar admin

**Regras de negócio:**
- Slug do motor é imutável após criação (rota depende dele)
- Admin pode desativar motor (soft); dados persistem

---

### F2 — Motor Social Selling: Seleção de Perfil (P0 — Fase 2)

**Descrição:** Dentro do motor Social Selling, usuário escolhe entre os perfis cadastrados (Cleiton, Julia) antes de acessar os módulos. Perfis são extensíveis via tabela.

**User story:** Como gestor de tráfego, quero escolher o perfil que vou gerenciar para não misturar dados de especialistas diferentes.

**Critérios de aceitação:**
- [ ] `/motors/social-selling` lista `social_profiles` ativos
- [ ] Card traz foto + nome + @ do Instagram + 1 métrica resumo (seguidores total)
- [ ] Click leva para `/motors/social-selling/[profile_slug]/dashboard`
- [ ] Admin e Infra podem criar novos perfis (nome, @, avatar, ativo)

---

### F3 — Social Selling · Dashboard do Perfil (P0 — Fase 2)

**Descrição:** Visão macro do perfil selecionado com cards de métricas agregadas e grid de posts impulsionados.

**User story:** Como gestor, quero ver de relance quanto investi e quantos seguidores vieram neste perfil para decidir próximos impulsionamentos.

**Critérios de aceitação:**
- [ ] Cards macro: **Valor investido** (somatório), **Custo médio por seguidor** (investido ÷ seguidores gerados), **Total de criativos impulsionados** (count posts), **Total de seguidores gerados** (soma)
- [ ] Cada card mostra valor + variação % vs período anterior (mês anterior por padrão)
- [ ] Grid de cards de posts abaixo — cada card mostra código, link externo, investido, seguidores, custo/seguidor, observações
- [ ] Click em card de post abre modal com todos os dados da última snapshot + histórico em gráfico de linha
- [ ] Filtro por período (7d, 30d, 90d, custom) no topo
- [ ] Filtro por flags: apenas fit, apenas ativos, apenas em teste

**Regras de negócio:**
- Custo por seguidor individual: `investment / followers_gained` (null se `followers_gained = 0`)
- Agregações sempre usam snapshot mais recente de cada post

---

### F4 — Social Selling · Impulsionar/Criativos (P0 — Fase 2)

**Descrição:** CRUD de posts impulsionados em formato de lista (linha por post) com ações contextuais.

**User story:** Como gestor de tráfego, quero cadastrar um post novo com orçamento e depois atualizar métricas, anexar análise e marcar fit conforme a campanha roda.

**Critérios de aceitação:**
- [ ] Botão "Novo Post" abre modal com campos: código (livre), link do post (URL), orçamento (R$)
- [ ] Após criação, post aparece como linha na tabela
- [ ] Cada linha tem 3 botões de ação:
  - [ ] **Atualizar métricas** → drawer com inputs: investimento, seguidores, custo/seguidor (calculado automático), curtidas, comentários, compartilhamentos, alcance. Salva snapshot novo — não sobrescreve
  - [ ] **Adicionar análise** → drawer com 3 opções mutuamente exclusivas: upload TXT (≤5MB), link externo (URL válida), texto livre (markdown)
  - [ ] **Marcar como fit** → toggle, altera `is_fit`
- [ ] Dois chips toggláveis na linha: **Em teste** (`is_test`), **Ativo** (`is_active`)
- [ ] Busca por código ou link
- [ ] Filtro: todos / fit / teste / desativado

**Regras de negócio:**
- Link do post é único por perfil (evita cadastro duplicado)
- Custo por seguidor sempre calculado: `investment / followers_gained`
- Análise é append-only — nova análise vira uma entrada nova, histórico preservado

---

### F5 — Social Selling · Tarefas (Kanban) (P0 — Fase 2)

**Descrição:** Kanban standalone para organizar tarefas operacionais do perfil, modelo ClickUp simplificado.

**User story:** Como qualquer usuário, quero mover tarefas entre colunas para acompanhar o fluxo de trabalho do perfil.

**Critérios de aceitação:**
- [ ] 4 colunas fixas: **Backlog**, **Em andamento**, **Em revisão**, **Concluído**
- [ ] Drag-and-drop entre colunas atualiza `status` e `position`
- [ ] Card mostra: título, prioridade (pill), assignee (avatar), due date (se houver)
- [ ] Botão "+" em cada coluna abre modal: título, descrição, prioridade (baixa/média/alta/urgente), assignee (user_profile), due_date
- [ ] Click no card abre drawer com detalhes + comentários
- [ ] Filtro por assignee + busca por título

**Regras de negócio:**
- Posição (ordem vertical) é `DECIMAL` — reinserir no meio não renumera toda a coluna
- Soft delete (arquivar) em vez de delete duro

---

### F6 — Motor Mentorias · Dashboard Global (P0 — Fase 1)

**Descrição:** Dashboard agregado do motor Mentorias com macro-indicadores.

**User story:** Como admin, quero ver em uma única tela a saúde do motor inteiro antes de entrar em mentorias específicas.

**Critérios de aceitação:**
- [ ] Cards macro: **Mentorias Ativas** (count `em_andamento`), **Investimento Total** (trafego + api, período filtrado), **Faturamento Total** (soma `valor_vendas`), **Base Total** (soma `leads_grupo` únicos no período), **Captação Tráfego Total** (soma `leads_grupo` vindos de integrações de tráfego)
- [ ] Arquitetura de cards é configurável: admin pode ocultar/reordenar cards via settings
- [ ] Filtro global de período (mês atual por padrão, 7d/30d/90d/custom)
- [ ] Indicador de meta vs realizado em cada card (se meta configurada para o período)
- [ ] Gráfico de linha abaixo dos cards: evolução diária de investimento × faturamento

**Regras de negócio:**
- Cards são definidos em `motor_dashboard_cards` (tabela) para permitir reordenação futura
- "Captação Tráfego Total" vem de snapshots de funis marcados com origem `traffic`

---

### F7 — Mentorias · Listagem (P0 — Fase 1)

**Descrição:** Tela de listagem de mentorias cadastradas em formato de cards, seguindo o padrão visual da referência.

**User story:** Como gestor, quero cadastrar uma mentoria nova e ver todas cadastradas em cards com as métricas principais.

**Critérios de aceitação:**
- [ ] Header: título "Mentorias" + subtítulo com contagem ("X mentorias encontradas") + botão **Nova Mentoria** (primary, azul)
- [ ] Filtros: busca por nome (debounce 300ms), dropdown status (Todos / Em andamento / Concluída), dropdown ordenação (Mais recentes / Mais antigas / Maior faturamento)
- [ ] Grid de 3 colunas em desktop, 1 em mobile
- [ ] Cada card tem: nome da mentoria, data/hora, pill de status, pill de especialista, 4 métricas em grid 2×2 (grupo, ao vivo, vendas, valor vendas), 4 barras de progresso com %: **Comparecimento** (azul), **Agendamento** (roxo), **Comparecimento Call** (laranja), **Conversão Call** (verde)
- [ ] Status com cor: `em_andamento` = amarelo/âmbar, `concluida` = verde
- [ ] Modal "Nova Mentoria" com: nome (obrigatório), data e horário (datetime picker), especialista (select de `social_profiles`), orçamento tráfego (R$, opcional)
- [ ] Click no card leva para `/motors/mentorias/[mentoria_id]`

**Regras de negócio:**
- Percentuais das barras calculados com regras explícitas (ver seção 9 abaixo)
- Cards sem snapshot ainda mostram "(sem debriefing)" ao lado do label e 0.0%

**Cálculo dos percentuais exibidos no card:**

| Métrica | Fórmula | Fallback |
|---|---|---|
| Comparecimento | `leads_ao_vivo / leads_grupo × 100` | 0% se `leads_grupo = 0` |
| Agendamento | `agendamentos / leads_ao_vivo × 100` | 0% se `leads_ao_vivo = 0` |
| Comparecimento Call | `calls_realizadas / agendamentos × 100` | 0% se `agendamentos = 0` |
| Conversão Call | `vendas / calls_realizadas × 100` | 0% se `calls_realizadas = 0` |

---

### F8 — Mentoria · Dashboard (P0 — Fase 1)

**Descrição:** Tela interna da mentoria com dashboard detalhado.

**User story:** Como gestor, quero ver todos os indicadores da mentoria e seus funis num único lugar.

**Critérios de aceitação:**
- [ ] Card principal **Investimento Total** (com dois sub-indicadores: Investimento em Tráfego, Investimento em API — WhatsApp)
- [ ] Cards individuais: Leads no Grupo, Leads Ao Vivo, Agendamentos, Calls Realizadas, Vendas, Valor em Venda, Valor de Entrada
- [ ] Cada card mostra valor atual + variação vs snapshot anterior
- [ ] Abaixo: seção "Funis" com card + botão **Adicionar Funil**
- [ ] Cada funil renderiza como card expansível com os indicadores do seu template + link da lista + botão de editar/adicionar campos

**Regras de negócio:**
- Métricas da mentoria são agregadas do último snapshot; histórico acessível via botão "Ver histórico"
- Investimento em API puxa de `integration_events` do Fluxon vinculados à mentoria

---

### F9 — Mentoria · Funis (P0 — Fase 1)

**Descrição:** Cada mentoria tem N funis. Funil usa um `funnel_template` que define quais campos existem. Admin/Infra pode criar novos templates.

**User story:** Como gestor, quero adicionar um funil "Funil Orgânico Julia" baseado no template padrão para começar a preencher indicadores.

**Critérios de aceitação:**
- [ ] Modal "Adicionar Funil": nome + select de template (`funnel_templates`)
- [ ] Template padrão seed: 11 campos (leads, link_lista, qualificados, ativados, no_grupo, ao_vivo, agendados, calls_realizadas, vendas, valor_venda, valor_entrada)
- [ ] Card do funil mostra cada campo com seu label, valor atual, fonte (ícone: manual, webhook, api)
- [ ] Botão **Editar indicadores** → drawer com inputs para cada campo editável manualmente
- [ ] Botão **Gerenciar campos** (admin/infra) → cria novo template ou edita campos do template existente (add/remove/reorder/rename)
- [ ] Histórico: botão "Ver histórico" abre modal com tabela de snapshots por campo

**Regras de negócio:**
- Cada UPDATE de campo cria um novo `funnel_metric_snapshots` (append-only)
- Campo com `source=webhook` ou `source=api` não pode ser editado manualmente (input disabled) — fonte é autoritativa
- Editar template em uso não apaga dados antigos — campos removidos ficam órfãos mas recuperáveis

---

### F10 — Mentoria · Tráfego (P0 — Fase 1)

**Descrição:** Visão operacional de investimento em tráfego com breakdown por dia e por funil.

**User story:** Como gestor de tráfego, quero ver o quanto foi investido em tráfego desta mentoria ao longo do tempo.

**Critérios de aceitação:**
- [ ] Tabela com colunas: data, funil de destino, valor, origem (manual/Meta Ads), responsável
- [ ] Input rápido para registrar investimento manual
- [ ] Gráfico de linha: investimento diário
- [ ] Total consolidado no topo

---

### F11 — Mentoria · Disparos (P0 — Fase 1)

**Descrição:** Visão dos disparos WhatsApp (via Fluxon) vinculados à mentoria, com custo e volume.

**User story:** Como admin, quero ver quanto custou o envio de WhatsApp e quantas mensagens saíram para cada funil.

**Critérios de aceitação:**
- [ ] Lista de eventos de disparo vindos do webhook Fluxon
- [ ] Colunas: data, funil, volume enviado, volume entregue, custo (R$), status
- [ ] Botão "Reprocessar" para eventos com erro
- [ ] Totalizadores: volume total + custo total

---

### F12 — Mentorias · Comparar (P0 — Fase 1)

**Descrição:** Seleciona 2 a 4 mentorias para visualizar lado a lado.

**User story:** Como admin, quero comparar duas mentorias para identificar padrões de performance.

**Critérios de aceitação:**
- [ ] Multi-select de mentorias (máx 4)
- [ ] Render side-by-side dos cards padrão de mentoria (mesmo layout da listagem)
- [ ] Tabela abaixo com diferenças: cada linha é uma métrica, cada coluna é uma mentoria, última coluna é variação % vs mentoria-base (primeira selecionada)
- [ ] Exportar CSV da tabela

---

### F13 — Integração: Webhook Genérico (P0 — Fase 1)

**Descrição:** Endpoint POST que recebe eventos de sistemas externos (Fluxon primeiro, Meta Ads e outros depois) e mapeia para métricas.

**User story:** Como gestor de infra, quero configurar uma fonte Fluxon e mapear os campos do payload para os campos de funil da mentoria.

**Critérios de aceitação:**
- [ ] `/api/webhooks/[source_slug]` aceita POST com `x-webhook-secret` header
- [ ] Payload é salvo cru em `integration_events` (JSONB) + processado async
- [ ] Mapping JSON configurado em `integration_sources.mapping_json` define como traduzir campos do payload em `funnel_metric_snapshots` ou `mentoria_metrics`
- [ ] UI de configuração: lista payloads recebidos recentes (drawer), constrói mapping com guided preview (similar ao PRD do Bethel CS Fase 13)
- [ ] Eventos com erro ficam na tabela com `error` preenchido + botão "Reprocessar"
- [ ] Deduplicação por `source_event_id` (se presente no payload)

**Regras de negócio:**
- Secret é gerado pelo sistema, exibido uma única vez
- Rate limit: 300 eventos/min por source

---

### F14 — Metas (P0 — Fase 1)

**Descrição:** Admin configura metas por mês × motor × mentoria para acompanhamento no dashboard.

**User story:** Como admin, quero definir meta de faturamento de R$ 200k para o motor Mentorias em maio/2026.

**Critérios de aceitação:**
- [ ] Tela `/settings/goals` lista metas ativas
- [ ] Botão "Nova meta": escopo (motor ou mentoria), métrica (faturamento, base, investimento, etc.), valor alvo, período (mês/ano)
- [ ] Dashboards puxam meta do período e mostram barra "realizado vs meta"
- [ ] Edição inline do valor alvo

---

### F15 — Gestão de Usuários e Roles (P0 — Fase 1)

**Descrição:** Admin convida usuários e define role.

**User story:** Como admin, quero convidar o Matheus como Gestor de Tráfego via magic link.

**Critérios de aceitação:**
- [ ] `/settings/users` lista usuários com role e status
- [ ] Botão "Convidar usuário": email + role
- [ ] Magic link enviado via Supabase Auth
- [ ] Admin pode alterar role de outro usuário (não o próprio)
- [ ] Admin pode desativar usuário (soft)

---

### F16 — Auditoria (P1)

**Descrição:** Log de alterações críticas (metas, templates, mudanças de role, delete de mentorias).

**Critérios de aceitação:**
- [ ] Tabela `audit_logs` preenchida por triggers ou por serviço de auditoria
- [ ] Tela admin lista logs filtráveis por entidade, usuário, ação

---

## 3. Modelo de dados (resumo; SQL completo em `schema.md`)

Entidades principais:

- **users** (Supabase Auth)
- **user_profiles** (1:1 com users) — role, nome, avatar
- **motors** — tipos de motor (social_selling, mentorias, …)
- **social_profiles** — perfis dentro do Social Selling (Cleiton, Julia)
- **posts** — posts impulsionados; **post_metrics** (snapshots); **post_analyses**
- **tasks** — kanban por perfil; **task_comments**
- **mentorias** — mentorias cadastradas; **mentoria_metrics** (snapshots)
- **funnel_templates** + **funnel_template_fields** — definição dos funis
- **funnels** — instâncias de funil ligadas a mentoria
- **funnel_metric_snapshots** — histórico de valores por campo do funil
- **goals** — metas (escopo: motor ou mentoria)
- **motor_dashboard_cards** — config de cards macro por motor
- **integration_sources** + **integration_events** — webhooks e eventos recebidos
- **audit_logs** — log de mudanças críticas

Relacionamentos críticos:
- `mentorias.specialist_id` → `social_profiles.id` (uma mentoria tem um especialista responsável)
- `funnels.mentoria_id` → `mentorias.id` (N:1)
- `funnels.template_id` → `funnel_templates.id` (N:1, template mutável)
- `funnel_metric_snapshots.funnel_id` + `field_key` + `captured_at` — trinca que define histórico

---

## 4. API Routes (resumo)

Convenções: todas sob `/api`, JSON, autenticação via cookie Supabase (`@supabase/ssr`), `GET` public lista, `POST` cria, `PATCH` edita parcial, `DELETE` soft.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/motors` | autenticado | Lista motores ativos + contagens |
| GET | `/api/social-profiles` | autenticado | Lista perfis de Social Selling |
| POST | `/api/social-profiles` | admin/infra | Cria perfil |
| GET | `/api/posts?profile=[slug]` | autenticado | Lista posts do perfil |
| POST | `/api/posts` | admin/trafego | Cria post (code, link, budget) |
| POST | `/api/posts/[id]/metrics` | admin/trafego | Cria novo snapshot de métricas |
| POST | `/api/posts/[id]/analyses` | admin/trafego/copy | Anexa análise (file/link/text) |
| PATCH | `/api/posts/[id]` | admin/trafego | Toggle `is_fit`, `is_test`, `is_active` |
| GET | `/api/mentorias` | autenticado | Lista mentorias com último snapshot agregado |
| POST | `/api/mentorias` | admin/trafego | Cria mentoria |
| GET | `/api/mentorias/[id]` | autenticado | Detalhe da mentoria com funis |
| POST | `/api/mentorias/[id]/metrics` | admin/trafego | Cria snapshot da mentoria |
| POST | `/api/mentorias/[id]/funnels` | admin/trafego/infra | Cria funil |
| PATCH | `/api/funnels/[id]` | admin/trafego/infra | Atualiza funil (nome, link_lista, template) |
| POST | `/api/funnels/[id]/snapshot` | admin/trafego/infra | Grava snapshot de campos do funil |
| GET | `/api/funnels/[id]/history?field=[key]` | autenticado | Histórico de um campo |
| GET | `/api/funnel-templates` | autenticado | Lista templates |
| POST | `/api/funnel-templates` | admin/infra | Cria template com fields |
| PATCH | `/api/funnel-templates/[id]` | admin/infra | Edita fields do template |
| GET | `/api/tasks?profile=[slug]` | autenticado | Kanban do perfil |
| POST | `/api/tasks` | autenticado | Cria task |
| PATCH | `/api/tasks/[id]` | autenticado | Atualiza task (status, position, assignee) |
| GET | `/api/compare?ids=[...]` | autenticado | Dados comparativos |
| GET | `/api/goals?scope_type=motor&scope_id=[id]&month=YYYY-MM` | autenticado | Metas do período |
| POST | `/api/goals` | admin | Cria meta |
| POST | `/api/webhooks/[source_slug]` | secret | Recebe payload externo (Fluxon etc.) |
| GET | `/api/integrations/sources` | admin/infra | Lista fontes |
| POST | `/api/integrations/sources` | admin/infra | Cria fonte |
| PATCH | `/api/integrations/sources/[id]` | admin/infra | Edita (incl. mapping) |
| POST | `/api/integrations/events/[id]/reprocess` | admin/infra | Reprocessa evento |
| GET | `/api/users` | admin | Lista usuários |
| POST | `/api/users/invite` | admin | Convida usuário (magic link) |
| PATCH | `/api/users/[id]` | admin | Altera role / desativa |

Shape padrão de resposta:
```json
{ "data": T } | { "error": "mensagem" }
```

Shape padrão de erro com códigos:
- 400 — validação Zod
- 401 — sem auth
- 403 — RLS/role insuficiente
- 404 — não encontrado
- 422 — regra de negócio
- 500 — inesperado

---

## 5. Integrações

| Serviço | Tipo | Dados trocados | Fallback |
|---|---|---|---|
| **Fluxon** | Webhook inbound + API outbound | Inbound: eventos de disparo (volume, custo, status); Outbound: consulta de saldo | Se webhook cair, input manual em `integration_events`; UI permite reprocessamento |
| **Meta Ads** (Fase 2) | API REST (Graph API) com token de acesso longo | Investimento por campanha, impressões, alcance | Input manual de investimento em caso de falha de API |
| **Webhook genérico** | Inbound | Qualquer JSON, mapeado via `mapping_json` | Evento cru fica em `integration_events` para reprocessar |
| **Supabase Auth** | SDK | Magic link, sessão JWT | — |
| **Supabase Storage** | SDK | Upload de análises TXT | — |

---

## 6. Auth & Roles

### 6.1 Método

Supabase Auth com **magic link**. Sessão persistida em cookies HTTP-only via `@supabase/ssr`. Middleware do Next.js refresca token automaticamente. Zero token em localStorage.

### 6.2 Onboarding

1. Admin convida via `/settings/users/invite` (email + role)
2. Supabase envia magic link
3. Usuário clica no link e cai em `/auth/callback`
4. Callback cria `user_profiles` com role do convite
5. Redirect para `/motors`

### 6.3 Matriz de permissões

| Recurso × Ação | Admin | Tráfego | Infra | Copy |
|---|---|---|---|---|
| Motores (CRUD) | ✅ | 👁️ | 👁️ | 👁️ |
| Social Profiles (CRUD) | ✅ | 👁️ | ✅ | 👁️ |
| Posts (CRUD) | ✅ | ✅ | 👁️ | 👁️ |
| Post Analyses | ✅ | ✅ | 👁️ | ✅ |
| Tasks (CRUD) | ✅ | ✅ | ✅ | ✅ |
| Mentorias (CRUD) | ✅ | ✅ | 👁️ | 👁️ |
| Mentoria Metrics | ✅ | ✅ | 👁️ | 👁️ |
| Funnel Templates | ✅ | 👁️ | ✅ | 👁️ |
| Funnels | ✅ | ✅ | ✅ | 👁️ |
| Funnel Snapshots | ✅ | ✅ | ✅ | 👁️ |
| Integrations | ✅ | 👁️ | ✅ | ❌ |
| Goals | ✅ | 👁️ | 👁️ | 👁️ |
| Users (CRUD) | ✅ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ | ❌ |

Legenda: ✅ full · 👁️ leitura · ❌ sem acesso

### 6.4 Enforcement em 3 camadas

1. **Middleware** — bloqueia rotas sensíveis (`/settings/users`, `/settings/integrations`) baseado em role
2. **RLS no Postgres** — toda tabela com policy por role (detalhes em `schema.md`)
3. **Route handlers** — revalidam role antes da operação

---

## 7. Não-funcionais

| Categoria | Requisito |
|---|---|
| **Performance** | TTFB < 500ms em dashboards com cache; LCP < 2.5s; bundle client < 200KB/rota; queries SSR com `cache: 'no-store'` apenas onde necessário |
| **Escalabilidade** | Até 10 usuários simultâneos (interno). Postgres suporta 100k+ posts / 1k mentorias / 100k snapshots sem refactor |
| **Disponibilidade** | SLA Vercel + Supabase padrão (~99.9% combinado) |
| **Segurança** | RLS em todas as tabelas, CORS restrito, rate limit 60/min por IP em API pública, 5/min em auth |
| **SEO** | N/A (app interno, `robots.txt` deny) |
| **Acessibilidade** | WCAG AA — focus visible, contraste 4.5:1, keyboard nav completa |
| **Logs** | `console.error` com prefixo de rota; sem console.log em prod; audit_logs para mudanças críticas |

---

## 8. Roadmap

| Fase | Duração estimada | Escopo | Entrega |
|---|---|---|---|
| **1 — Base + Mentorias** | 2-3 semanas | Setup, auth, layout, motor Mentorias completo (F1, F6-F15 — incluindo webhook Fluxon) | Mentorias em produção, Fluxon integrado, metas e usuários |
| **2 — Social Selling** | 1-2 semanas | F2, F3, F4, F5 + integração Meta Ads | Social Selling completo |
| **3 — Polish** | 1 semana | Responsividade avançada, error handling refinado, auditoria UI (F16), deploy final | v1.0 estável |

Total: ~4-6 semanas solo com Claude Code.

---

## 9. Riscos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Fluxon não expõe webhook — só pull via API | Média | Alto | Webhook genérico + worker que faz pull se a fonte for `fluxon_pull`. Adapter pattern isola |
| R2 | Templates de funil editados retroativamente quebram histórico de snapshots | Alta | Médio | Snapshots guardam `field_key` como string (não FK). Campos removidos do template viram órfãos mas recuperáveis. Nunca cascade delete em template_fields |
| R3 | Meta Ads API (Fase 2) tem rate limit baixo e expira token em 60 dias | Alta | Médio | Adapter com retry exponencial + renovação de token automática + log em `integration_events` |
| R4 | Usuários tentam editar campos de funil que são `source=webhook` | Alta | Baixo | UI desabilita input + tooltip explicativo; RLS bloqueia atualização manual com erro claro |
| R5 | Comparar mentorias com templates de funil diferentes fica inválido | Média | Médio | Comparação macro usa apenas métricas de `mentoria_metrics` (schema fixo), não métricas de funil |
| R6 | Dashboard fica lento com muitas mentorias e snapshots | Média | Médio | Views materializadas + índices em `(mentoria_id, captured_at DESC)`. Paginação client em listagem |
| R7 | Soft delete esquecido em RLS causa vazamento de dados "deletados" | Baixa | Alto | Todas as policies filtram `deleted_at IS NULL`. Checklist pre-deploy |
| R8 | Migration do schema aplicada fora de ordem quebra FKs | Média | Alto | Ordem explícita em `schema.md` + numeração de arquivo de migration (001_, 002_, …) |
| R9 | Magic link vai pra spam e bloqueia usuário | Média | Médio | Configurar SMTP customizado no Supabase com domínio bethel. Fase 2 |
| R10 | Escopo crescer para incluir cliente externo (multi-tenant) | Média | Alto | v1 é single-tenant deliberadamente. Adição de `org_id` em todas tabelas é refactor grande — só iniciar nova fase |

---

## 10. Fora de escopo v1.0

- App mobile nativo (PWA em backlog)
- Relatórios PDF automáticos
- Pagamentos
- Integração com Bethel Gestão, Bethel CS, Closer CRM (avaliar em v2)
- Notificações push
- IA para insights automáticos sobre mentorias

---

## 11. Glossário

- **Motor** — frente de aquisição com módulos, métricas e regras próprias
- **Perfil (Social Selling)** — personalidade pública (Cleiton, Julia) dentro do motor Social Selling
- **Post** — criativo orgânico impulsionado com tráfego pago
- **Fit** — marcação de que um post está gerando leads qualificados
- **Mentoria** — evento high-ticket ao vivo com funil de conversão
- **Funil** — conjunto de indicadores de conversão vinculado a uma mentoria, baseado em template
- **Template de funil** — esquema de campos que define a estrutura de um funil
- **Snapshot** — registro imutável de um conjunto de métricas num momento
- **Fluxon** — sistema terceiro de disparos WhatsApp API oficial
