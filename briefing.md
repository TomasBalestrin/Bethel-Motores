> 🛡️ Capitão América | 21/04/2026 | v1.0

# Briefing — Bethel Motores

## Identidade

**Nome:** Bethel Motores
**Descrição (1 frase):** Plataforma modular de motores de crescimento da Bethel Systems — cada motor concentra operação, métricas e controle financeiro de uma frente de aquisição específica (Social Selling, Mentorias, etc.), com arquitetura aberta para novos motores no futuro.
**Tipo:** Sistema interno (single-tenant), desktop-first.

## Problema

A operação Bethel hoje roda Social Selling (impulsionamento pago de criativos com Cleiton e Julia) e Mentorias (eventos ao vivo com funil de conversão) em planilhas, CRMs separados e relatórios manuais. Não há uma única superfície para:
- Acompanhar investimento × resultado por motor, por mês, por mentoria
- Comparar performance entre mentorias diferentes
- Rastrear o ciclo completo de cada post impulsionado (investimento → seguidores → análise → fit)
- Consolidar funis com indicadores heterogêneos (diferentes fontes: Fluxon, Meta Ads, manual)

## Público-alvo (personas)

| Persona | Necessidade principal | Nível de acesso |
|---|---|---|
| **Admin** (Bethel, Tomás) | Visão completa, config de motores/metas/templates, gestão de usuários | Total |
| **Gestor de Tráfego** | Cadastrar posts, atualizar métricas, criar mentorias, lançar investimento | Escrita nos dois motores |
| **Gestor de Infraestrutura** | Configurar integrações (Fluxon, Meta Ads), webhooks, templates de funil | Config + leitura |
| **Copy** | Registrar análises de posts, adicionar observações, acompanhar fit | Escrita em Social Selling (análises/observações), leitura em Mentorias |

## Motores (MVP)

1. **Social Selling** — impulsionamento de conteúdo orgânico pago nos perfis dos especialistas
2. **Mentorias** — eventos ao vivo com funil de conversão para mentoria high-ticket

Arquitetura aberta: motores novos podem ser adicionados no futuro via tabela `motors` + configuração de módulos por motor.

## Features principais (P0)

1. Seleção de motor após login (home dos motores)
2. **Social Selling:** seleção de perfil (Cleiton/Julia) → Dashboard + Impulsionar/Criativos + Tarefas (Kanban)
3. **Mentorias:** Dashboard + lista de Mentorias + Comparar → interface da mentoria (Dashboard + Tráfego + Disparos) com funis por template
4. Snapshots históricos de métricas (mentoria e funis) para filtros temporais e evolução
5. Ingestão de dados: manual + webhook (Fluxon, Meta Ads, genérico)
6. Metas por motor × mês × mentoria, com acompanhamento visual no Dashboard

## Roles e permissões (matriz resumida)

| Recurso | Admin | Tráfego | Infra | Copy |
|---|---|---|---|---|
| Motores + Profiles + Templates | CRUD | R | CRUD (exceto profiles) | R |
| Posts (cadastro, métricas) | CRUD | CRUD | R | R |
| Análises de post | CRUD | CRUD | R | CRUD |
| Mentorias (cadastro, métricas) | CRUD | CRUD | R | R |
| Funis da mentoria | CRUD | CRUD | CRUD | R |
| Tarefas (Kanban) | CRUD | CRUD | CRUD | CRUD |
| Integrações + Webhooks | CRUD | R | CRUD | — |
| Metas | CRUD | R | R | R |
| Usuários e convites | CRUD | — | — | — |

## Decisões técnicas fechadas

| Ponto | Decisão |
|---|---|
| Stack | Next.js 14 App Router + TS strict + Supabase + Vercel + Tailwind + shadcn/ui |
| Auth | Supabase Auth via magic link |
| Multi-tenancy | Não — single-tenant interno |
| Pagamento | N/A (interno) |
| Motores extensíveis | Sim, tabela `motors` |
| Social profiles extensíveis | Sim, tabela `social_profiles` |
| Funis com campos custom | Template-based (tabela `funnel_templates` + `funnel_template_fields`) |
| Histórico de métricas | Snapshots (tabelas `*_metric_snapshots`) |
| Status de mentoria | Enum fixo: `em_andamento` \| `concluida` |
| Upload de análises | Supabase Storage, bucket `post-analyses`, limite 5MB |
| Código de post | Texto livre |
| Metas | Por mês × motor × mentoria |
| Comparar mentorias | Side-by-side até 4 + tabela de diferenças % |
| Tarefas (Kanban) | Standalone (sem integração com Bethel Gestão) |
| Investimento em API | Custo de disparos WhatsApp oficial via Fluxon |
| MVP em fases | Fase 1 Mentorias → Fase 2 Social Selling (mesma codebase, tasks separadas) |

## Integrações externas

| Serviço | Uso | Tipo | Fase |
|---|---|---|---|
| **Fluxon** | Disparos WhatsApp API oficial — volumes e custo | Webhook + API | 1 |
| **Meta Ads** | Investimento e performance de impulsionamento | API (Graph API) | 2 |
| **Webhook genérico** | Fonte extensível para sistemas futuros, com mapping configurável | Inbound webhook | 1 |
| **Supabase Storage** | Armazenamento de análises em TXT | SDK | 1 |

## Não-funcionais

- **Performance:** TTFB < 500ms em dashboards, LCP < 2.5s, bundle client < 200KB por rota
- **Concorrência:** até 10 usuários simultâneos (interno)
- **Compatibilidade:** Desktop-first, 1280px+ como target primário; mobile em Fase 3 (PWA)
- **LGPD:** dados internos da operação, sem PII de clientes externos além de nomes de mentoria
- **Uptime:** 99% (SLA Vercel + Supabase padrão)

## Fora de escopo (v1)

- Mobile nativo
- Pagamentos
- Multi-tenancy
- Dashboard público ou de cliente final
- Integração com Bethel Gestão (Kanban separado por ora)
- Geração de relatórios PDF automáticos

## Resumo de fases

| Fase | Escopo | Bloco de tasks |
|---|---|---|
| **1** | Setup + Auth + Layout + Motor de Mentorias completo (Dashboard, Mentorias, Comparar, funis com templates, snapshots, webhook Fluxon) | A, B, C, D |
| **2** | Motor de Social Selling completo (profiles, posts, métricas, análises, fit, Kanban, Meta Ads) | E |
| **3** | Polish (responsividade, erros, SEO, deploy, metas avançadas) | F |
