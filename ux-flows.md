> 🕷️ Viúva Negra | 21/04/2026 | v1.0

# UX Flows — Bethel Motores

## 1. Mapa de rotas

```
/                                                 [público → redirect se logado]
├── /login                                        [público]
├── /auth/callback                                [público, troca code por sessão]
│
├── /motors                                       [🔒 autenticado]
│   ├── /motors/mentorias                         [🔒 autenticado] — dashboard motor
│   │   ├── /motors/mentorias/listagem            [🔒 autenticado] — listagem mentorias
│   │   ├── /motors/mentorias/comparar            [🔒 autenticado] — comparar mentorias
│   │   └── /motors/mentorias/[id]                [🔒 autenticado] — dashboard mentoria
│   │       ├── /motors/mentorias/[id]/trafego    [🔒 autenticado]
│   │       └── /motors/mentorias/[id]/disparos   [🔒 autenticado]
│   │
│   └── /motors/social-selling                    [🔒 autenticado] — seleção perfil
│       └── /motors/social-selling/[profileSlug]  [🔒 autenticado] — dashboard perfil
│           ├── /motors/social-selling/[slug]/criativos [🔒 autenticado]
│           └── /motors/social-selling/[slug]/tarefas   [🔒 autenticado]
│
└── /settings                                     [🔒 autenticado]
    ├── /settings/profile                         [🔒 autenticado]
    ├── /settings/users                           [🔒 admin only]
    ├── /settings/integrations                    [🔒 admin/infra]
    ├── /settings/funnel-templates                [🔒 admin/infra]
    ├── /settings/goals                           [🔒 admin]
    └── /settings/audit                           [🔒 admin only]
```

Layout group `(dashboard)` envolve tudo autenticado, com sidebar + header persistentes. Layout group `(auth)` isolado, sem chrome.

---

## 2. Navegação

### 2.1 Sidebar (desktop fixa, mobile drawer)

| Item | Rota | Ícone | Visibilidade |
|---|---|---|---|
| Motores | `/motors` | `Layers` | Todos |
| — Mentorias | `/motors/mentorias` | `GraduationCap` | Todos (com acesso ao motor) |
| — Social Selling | `/motors/social-selling` | `Megaphone` | Todos |
| Settings | `/settings` | `Settings` | Todos (item desdobra) |
| — Usuários | `/settings/users` | `Users` | Admin |
| — Integrações | `/settings/integrations` | `Plug` | Admin, Infra |
| — Templates de Funil | `/settings/funnel-templates` | `Workflow` | Admin, Infra |
| — Metas | `/settings/goals` | `Target` | Admin |
| — Auditoria | `/settings/audit` | `FileClock` | Admin |

Sidebar colapsável via botão no topo (persiste em `uiStore` Zustand + cookie).

### 2.2 Header

- Breadcrumbs à esquerda (ex: `Motores > Mentorias > Lançamento Maio`)
- Filtro de período global (quando aplicável: dashboards)
- Avatar + dropdown (Perfil, Sair) à direita
- Altura fixa 56px, border bottom

### 2.3 Breadcrumbs

Gerado automaticamente do path. Exemplo:

```
Motores  →  Mentorias  →  Lançamento Maio 2026  →  Tráfego
```

Cada segmento é um link (exceto o último, atual).

---

## 3. Auth Flow

### 3.1 Login

**Persona:** Qualquer usuário convidado

**Trigger:** Acesso a qualquer rota privada sem sessão → redirect `/login`

```
[/login]
   ↓  (preenche email → click "Enviar link")
[Toast: "Link enviado — confira seu email"]
   ↓  (usuário abre email)
[Click no link]
   ↓
[/auth/callback?code=...]
   ↓  (troca code por sessão via Supabase)
[Redirect /motors]
```

**Elementos da tela `/login`:**
- Logo Bethel Motores (centralizado)
- H1: "Entrar no Bethel Motores"
- Subtitle: "Enviamos um link mágico para seu email"
- Input email (validação Zod blur)
- Botão primary "Enviar link" (disabled até email válido, loading no submit)
- Texto menor: "Ao entrar você concorda com os termos de uso interno Bethel"

**Estados:**
- Loading: botão com spinner
- Success: toast 5s + card com "Verifique seu email"
- Erro (rate limit, email inválido): error inline abaixo do input

### 3.2 Callback

`/auth/callback?code=...`:

1. Extrai `code` do searchParam
2. Chama `supabase.auth.exchangeCodeForSession(code)`
3. Se sucesso: redirect `/motors`
4. Se erro: redirect `/login?error=invalid_link`

### 3.3 Logout

Botão em dropdown do avatar → chama `supabase.auth.signOut()` → redirect `/login`

---

## 4. Onboarding (primeiro login)

Usuário convidado via magic link pela primeira vez:

1. Callback cria `user_profiles` automaticamente via trigger (role vem do convite)
2. Redirect `/motors`
3. Se `user_profiles.name` for vazio (não preenchido no convite), modal "Complete seu perfil" com nome + avatar upload
4. Ao submeter, redireciona para `/motors` normal

Sem tour guiado na v1 — admin comunica processo diretamente no onboarding interno.

---

## 5. Fluxos por feature

### F1 — Seleção de motor

**Persona:** Qualquer usuário logado
**Trigger:** Login concluído OU click em "Motores" na sidebar

```
[/motors]
   ↓  (grid de cards de motores)
[Click em card "Mentorias"]
   ↓
[/motors/mentorias]  — dashboard do motor
```

**Elementos `/motors`:**
- H1: "Motores"
- Subtitle: "Selecione o motor para continuar"
- Grid 2-3 colunas de cards
- Cada card: ícone, nome, descrição, contador ("N mentorias em andamento", "N perfis ativos")
- Hover: sombra e elevação
- Empty state se não houver motores ativos: ícone + "Nenhum motor disponível. Contate um admin."

---

### F6 — Mentorias · Dashboard Global

**Persona:** Admin, Tráfego
**Trigger:** Click em motor "Mentorias"

```
[/motors/mentorias]
  ├── 5 cards macro (com filtro período no topo)
  ├── Gráfico de linha investimento × faturamento
  └── 2 tabs: "Mentorias" (→ listagem) | "Comparar"
```

**Elementos:**
- Header: título "Motor de Mentorias" + filtro período (dropdown: 7d / 30d / 90d / mês atual / custom)
- Grid de 5 cards: Mentorias Ativas, Investimento Total, Faturamento Total, Base Total, Captação Tráfego Total
- Cada card: label, valor, delta % vs período anterior, barra de meta (se configurada)
- Abaixo: gráfico de linha (Recharts) com 2 séries
- Call-to-action: botão "Ver todas mentorias" → `/motors/mentorias/listagem`

**Estados:**
- Loading: skeleton de cards
- Empty: "Nenhuma mentoria cadastrada" + botão "Nova Mentoria"

---

### F7 — Mentorias · Listagem

**Persona:** Admin, Tráfego
**Trigger:** Click em "Ver mentorias" ou sidebar

```
[/motors/mentorias/listagem]
   ↓  (filtro status, busca, ordenação)
[Grid de cards de mentoria]
   ↓  (click em card)
[/motors/mentorias/[id]]  — dashboard mentoria

   OU

[Click em "Nova Mentoria"]
   ↓
[Modal form: nome, data/hora, especialista, orçamento]
   ↓  (salvar)
[Toast success + card aparece na lista]
```

**Elementos:**
- Header: título + subtitle com count + botão "Nova Mentoria" (primary azul)
- Barra de filtros: busca (debounce 300ms), dropdown status (Todos / Em andamento / Concluída), dropdown ordenação
- Grid 3 cols desktop / 1 col mobile
- Card (conforme referência visual anexada pelo Bethel):
  - Nome da mentoria (H3)
  - Data/hora (texto pequeno, cor dim)
  - Pill status (âmbar/verde)
  - Pill especialista (azul com @handle)
  - Grid 2×2 de métricas: Grupo, Ao Vivo, Vendas, Valor
  - 4 barras progresso com label + %: Comparecimento (azul), Agendamento (roxo), Comparecimento Call (laranja), Conversão Call (verde)
  - Se sem snapshot: label muda para "Comparecimento (sem debriefing)" e barra em 0%

**Modal "Nova Mentoria":**
- Campos: Nome*, Data e horário* (datetime-local), Especialista* (select de social_profiles), Orçamento de Tráfego (opcional, R$)
- Validação Zod blur + submit
- Botões: Cancelar / Criar

---

### F8 — Mentoria · Dashboard

**Persona:** Admin, Tráfego, Copy
**Trigger:** Click em card de mentoria

```
[/motors/mentorias/[id]]
  ├── Header: nome + data + status pill + especialista + botão "Editar"
  ├── Card investimento total (com sub-cards trafego + api)
  ├── Grid de 7 cards de métricas base
  ├── Botão "Atualizar métricas" → drawer
  └── Seção "Funis"
      ├── Botão "Adicionar Funil" → modal
      └── Cards expansíveis de cada funil
         └── Botão "Editar indicadores" → drawer
```

**Drawer "Atualizar métricas":**
- Inputs numéricos: Leads Grupo, Leads Ao Vivo, Agendamentos, Calls Realizadas, Vendas, Valor Vendas (R$), Valor Entrada (R$), Investimento Tráfego (R$), Investimento API (R$)
- Nota: "Esta atualização cria uma nova snapshot; o histórico é preservado"
- Botões: Cancelar / Salvar

**Modal "Adicionar Funil":**
- Campos: Nome*, Template* (select), Link da Lista (URL opcional), é funil de tráfego? (toggle)
- Após criar, funil aparece na lista com indicadores zerados

**Drawer "Editar indicadores do funil":**
- Para cada campo editável do template: input apropriado (number/currency/percentage/url/text)
- Campos com `source=webhook/api` ficam disabled com tooltip "Vem automaticamente de [fonte]"
- Header: "Edit: [Nome do Funil]" + "Última atualização há X"
- Botões: Cancelar / Salvar (cria snapshot)

---

### F9 — Funis e Templates

**Persona:** Admin, Infra
**Trigger:** Botão "Gerenciar campos" ou `/settings/funnel-templates`

```
[/settings/funnel-templates]
   ↓
[Lista de templates]
   ↓  (click em template)
[Editor de template]
  ├── Dados gerais (nome, descrição, is_default)
  ├── Lista de campos (drag-and-drop reorder)
  └── Botão "+ Adicionar campo"
```

**Editor de campo (modal):**
- Campos: Key* (slug, imutável após criação), Label*, Tipo (number/currency/percentage/url/text), Fonte default (manual/webhook/api), Obrigatório (toggle), Agregável em comparação (toggle)
- Warning se editando campo em uso: "Este campo tem N snapshots históricos — key não pode ser alterada para não quebrar o histórico"

---

### F10 — Mentoria · Tráfego

**Persona:** Admin, Tráfego
**Trigger:** Tab "Tráfego" dentro da mentoria

```
[/motors/mentorias/[id]/trafego]
  ├── Card total investido + input rápido "Registrar investimento"
  ├── Gráfico de linha investimento diário
  └── Tabela: data | funil | valor | origem | responsável
```

**Input rápido:** form inline (data, valor, funil destino) — evita drawer para ação frequente.

---

### F11 — Mentoria · Disparos

**Persona:** Admin, Infra
**Trigger:** Tab "Disparos"

```
[/motors/mentorias/[id]/disparos]
  ├── Totalizadores: volume total + custo total
  ├── Lista de eventos Fluxon (data, funil, volume enviado, entregue, custo, status)
  └── Botão "Reprocessar" em eventos com status=error
```

**Row actions:**
- Ver payload cru (drawer com JSON)
- Reprocessar (botão, disponível só para admin/infra)

---

### F12 — Mentorias · Comparar

**Persona:** Admin
**Trigger:** Tab "Comparar" no dashboard do motor

```
[/motors/mentorias/comparar]
   ↓  (multi-select busca, máx 4 mentorias)
[Click em "Comparar"]
   ↓
[View side-by-side]
  ├── Cards de mentoria lado a lado (máx 4 colunas)
  └── Tabela diferenças: linha por métrica, coluna por mentoria, última coluna = variação % vs primeira
  └── Botão "Exportar CSV"
```

**Regras:**
- Primeira mentoria selecionada é a base (100%)
- Variação % calculada sem arredondar a zero se valor for próximo
- Métricas comparadas: leads_grupo, leads_ao_vivo, agendamentos, calls_realizadas, vendas, valor_vendas, investimento_total + 4 percentuais

---

### F2/F3 — Social Selling · Seleção Perfil + Dashboard

```
[/motors/social-selling]
  └── Grid de perfis (cards grandes: avatar + nome + @handle + métrica "N seguidores este mês")

[Click em perfil "Cleiton"]
  ↓
[/motors/social-selling/cleiton]  — dashboard perfil
  ├── Header: avatar + nome + @ + filtro período
  ├── 4 cards macro: Valor Investido, Custo/Seguidor, Total Criativos, Total Seguidores
  ├── Filtro: Todos / Fit / Em teste / Desativados
  └── Grid de cards de posts
```

---

### F4 — Social Selling · Criativos (Impulsionar)

```
[/motors/social-selling/[slug]/criativos]
  ├── Header: tab Criativos + botão "Novo Post"
  └── Tabela com colunas: Código | Link | Orçamento | Métricas resumo | Chips (Em teste / Ativo / Fit) | Ações

[Click em "Novo Post"]
  ↓
[Modal: Código (livre), Link (URL), Orçamento (R$)]
  ↓  (salvar)
[Toast success + linha aparece na tabela]

[Click em "Atualizar métricas" em uma linha]
  ↓
[Drawer: inputs Investimento, Seguidores, Likes, Comentários, Compartilhamentos, Alcance]
  → custo/seguidor calculado automaticamente (disabled)
  ↓  (salvar)
[Toast success + snapshot gravado]

[Click em "Adicionar análise"]
  ↓
[Drawer com 3 tabs: Upload TXT | Link externo | Texto livre]
  ↓  (um dos três preenchido, submit)
[Toast success]

[Toggle "Fit"]
  ↓  (PATCH /api/posts/[id])
[Chip atualiza visualmente com optimistic update]
```

---

### F5 — Social Selling · Tarefas (Kanban)

```
[/motors/social-selling/[slug]/tarefas]
  └── 4 colunas: Backlog | Em andamento | Em revisão | Concluído
      └── Cards arrastáveis (@dnd-kit)

[Drag card entre colunas]
  ↓  (optimistic update + PATCH /api/tasks/[id])
[Card reposiciona; se 500 rollback + toast error]

[Click em "+" na coluna]
  ↓
[Modal: Título*, Descrição, Prioridade, Assignee, Due Date]
  ↓  (criar)
[Card aparece no topo da coluna]

[Click em card existente]
  ↓
[Drawer: detalhes + lista de comentários + input novo comentário]
```

---

### F13 — Integração: Webhook

```
[/settings/integrations]
  └── Lista de sources (Fluxon, Meta Ads quando existir, webhook genérico)

[Click em "Nova source"]
  ↓
[Modal: slug, nome, tipo, gerar secret]
  ↓  (criar)
[Modal mostra secret uma única vez com botão "Copiar"]

[Click em source existente]
  ↓
[Drawer: dados + último payload recebido (JSON) + mapping editor]

[Mapping Editor]
  ├── Lista de campos do payload (pré-preenchida se há histórico de eventos)
  ├── Dropdown "Mapear para" por linha: mentoria_metrics.X | funnel_field.X | ignorar
  └── Preview live: "Se este payload chegasse, geraria as seguintes atualizações: [...]"
```

---

### F14 — Metas

```
[/settings/goals]
  └── Tabela de metas ativas (escopo, métrica, período, alvo, realizado)

[Click "Nova meta"]
  ↓
[Modal: Escopo (motor/mentoria) → select específico, Métrica, Valor alvo, Mês/Ano]
  ↓  (criar)
[Toast success + linha aparece]

[Click edit inline em valor alvo]
  ↓
[Input inline + Enter para salvar]
```

---

### F15 — Usuários

```
[/settings/users]  — admin only
  └── Tabela: email, nome, role, status, created_at

[Click "Convidar usuário"]
  ↓
[Modal: Email*, Role*]
  ↓  (enviar)
[Toast "Convite enviado para [email]"]
  → Magic link vai automaticamente

[Row action: alterar role]
  ↓
[Select inline + confirmação]

[Row action: desativar]
  ↓
[AlertDialog "Desativar [nome]? O usuário não poderá mais acessar."]
  ↓  (confirmar)
[Soft delete + toast]
```

---

## 6. Padrões de interação

### 6.1 Formulários

- Label **acima** do input (nunca placeholder como label)
- Validação Zod no **blur** (feedback logo após o usuário sair do campo)
- Botão submit **disabled até o form estar válido**
- Loading spinner no botão durante submit (label troca para "Salvando…")
- Erros inline com ícone `AlertCircle` em cor `destructive`
- Campos opcionais marcados com "(opcional)" ao lado do label

### 6.2 Tabelas

- Busca com **debounce 300ms** (via `useDebounce` hook)
- Filtros em linha acima da tabela
- Sort por coluna (ícone `ArrowUpDown` no header)
- Paginação client-side até 100 linhas; server-side > 100
- Row actions em dropdown `MoreVertical` à direita
- Skeleton de 5 linhas como loading
- Empty state com ícone + mensagem + CTA

### 6.3 Modais vs Drawers

| Use modal quando | Use drawer quando |
|---|---|
| ≤ 5 campos | > 5 campos ou conteúdo complexo |
| Ação rápida (criar, confirmar) | Edição detalhada, múltiplas seções |
| Precisa bloquear interação total | Permite referência ao conteúdo por trás |

Exemplos: "Nova Mentoria" = modal (4 campos), "Atualizar métricas de mentoria" = drawer (9 campos), "Adicionar análise" = drawer (tabs + preview)

### 6.4 Feedback

| Situação | UI |
|---|---|
| Success | Toast verde 3s (via `sonner`) |
| Error | Toast vermelho persistente até clicar fechar |
| Info | Toast neutro 4s |
| Confirmação destrutiva | `AlertDialog` com botão destrutivo em vermelho |
| Loading curto (< 1s) | Spinner inline no botão |
| Loading médio (1-5s) | Skeleton que imita layout final |
| Loading longo (> 5s) | Barra de progresso se possível |

### 6.5 Estados obrigatórios

Todo componente com dados externos implementa:

1. **Loading** (skeleton ou spinner)
2. **Empty** (mensagem + CTA)
3. **Error** (mensagem + retry)
4. **Success** (dados renderizados)

---

## 7. Responsividade (mobile — Fase 3)

| Elemento desktop | Comportamento mobile |
|---|---|
| Sidebar fixa lateral | Drawer (hamburger no header) |
| Grid 3 cols de mentorias | 1 col |
| Tabelas densas | Cards com as 3-4 colunas mais importantes + "ver mais" |
| Modais médios | Modal fullscreen |
| Drawers laterais | Bottom sheet |
| Filtros em linha | Botão "Filtros" → bottom sheet |
| Kanban 4 cols | Tabs (1 coluna visível por vez) — ou scroll horizontal |

MVP é desktop-first; mobile recebe layout funcional mas não otimizado até Fase 3.

---

## 8. Acessibilidade

- **Keyboard navigation**: todos os elementos interativos acessíveis via Tab; ordem lógica
- **Focus visible**: outline `2px solid accent` em focused elements (não remover com `outline: none`)
- **ARIA labels** em ícones-botões (`<button aria-label="Editar">`)
- **Skip to content**: link visível no Tab 1 que pula direto ao `<main>`
- **Contraste**: WCAG AA (4.5:1 texto normal, 3:1 texto grande)
- **Roles corretos**: `role="alert"` em toasts de erro, `role="dialog"` em modais
- **Labels associados** a inputs via `htmlFor` / `id`

Biblioteca shadcn/ui já cobre a maior parte dos padrões ARIA. Components custom (Kanban, CompareGrid) precisam verificação manual.

---

## 9. Empty states obrigatórios

| Tela | Empty state |
|---|---|
| `/motors` (sem motores) | "Nenhum motor disponível. Contate o administrador." |
| `/motors/mentorias/listagem` (sem mentorias) | Ícone + "Nenhuma mentoria cadastrada ainda" + botão "Nova Mentoria" |
| Mentoria sem funis | "Esta mentoria ainda não tem funis. Adicione o primeiro para começar." + botão "Adicionar Funil" |
| Mentoria sem snapshot | Cards mostram 0 e barras em "sem debriefing" com cor cinza |
| Perfil sem posts | "Nenhum criativo impulsionado. Crie o primeiro para começar." + botão "Novo Post" |
| Kanban vazio | Cada coluna com "Nenhuma tarefa. Clique em + para criar." |
| Comparar sem seleção | "Selecione 2 a 4 mentorias para comparar." |
| Integração sem eventos | "Nenhum evento recebido ainda. Teste disparando um webhook." |

---

## 10. Confirmações destrutivas

Toda ação destrutiva (arquivar, desativar, deletar) usa `AlertDialog` com:

- Título claro ("Desativar usuário [nome]?")
- Descrição explicando consequência ("O usuário não poderá mais fazer login")
- Botão cancelar (secundário) à esquerda
- Botão confirmar destrutivo (vermelho) à direita

Foco inicial no botão **Cancelar** (segurança).
