

# Relatório Técnico: Arquitetura de Interpolação de Variáveis -- Plataforma CELEBREI

---

## 1 -- MAPA DAS FUNÇÕES DE INTERPOLAÇÃO

### 1.1 `replaceVariables(text, data)`
- **Arquivo:** `supabase/functions/wapi-webhook/index.ts` (linha 456)
- **Formato suportado:** `{{key}}`, `{{ key }}` e `{key}` (case-insensitive)
- **Mecanismo:** Loop genérico sobre `data: Record<string, string>`, regex com escape de caracteres especiais
- **Utilizada em:** Bot de qualificação (welcome, completion, transfer, work_interest, confirmações de pergunta)
- **Variáveis resolvidas:** Todas as chaves presentes no objeto `data` passado como argumento (dinâmico)

### 1.2 `replaceVars(text)` (closure no Flow Builder)
- **Arquivo:** `supabase/functions/wapi-webhook/index.ts` (linha 1217)
- **Formato suportado:** `{{key}}` e `{key}` (case-insensitive)
- **Mecanismo:** Monta um `aliasMap` fixo + merge com `data` coletado do bot; aliases têm precedência
- **Utilizada em:** Flow Builder (todos os node types: message, question, action, end, qualify)
- **Variáveis resolvidas:**
  - `{nome}` → `data.customer_name || contactName || contactPhone`
  - `{mes}` → `data.event_date`
  - `{convidados}` → `data.guest_count`
  - `{dia}` → `data.visit_day`
  - `{nome-empresa}`, `{nome_empresa}`, `{empresa}`, `{buffet}` → `companyName`
  - Qualquer chave adicional presente em `data` (bot_data coletado)

### 1.3 `replaceVars(template)` (closure no Flow Timer Timeouts)
- **Arquivo:** `supabase/functions/follow-up-check/index.ts` (linha 1451)
- **Formato suportado:** Apenas `{key}` (single brace, case-sensitive)
- **Mecanismo:** Cadeia fixa de `.replace()` com regex simples
- **Utilizada em:** Timeout de nós do Flow Builder (quando timer expira)
- **Variáveis resolvidas:**
  - `{nome}` → firstName
  - `{customer_name}` → `collectedData.customer_name`
  - `{event_date}` → `collectedData.event_date`
  - `{guest_count}` → `collectedData.guest_count`
  - `{child_name}` → `collectedData.child_name`
  - `{child_age}` → `collectedData.child_age`

### 1.4 Substituição inline nos Follow-ups
- **Arquivo:** `supabase/functions/follow-up-check/index.ts` (linha 747)
- **Formato suportado:** Apenas `{key}` (single brace, case-sensitive)
- **Mecanismo:** Cadeia fixa de `.replace()` inline (não é uma função nomeada)
- **Utilizada em:** Régua de follow-ups (FU1-FU4), auto-lost, bot-inactive follow-up
- **Variáveis resolvidas:**
  - `{nome}` → `resolveFirstName()`
  - `{empresa}` → `companies.name`
  - `{unidade}` → `campaign_leads.unit`
  - `{mes}` → `campaign_leads.month`
  - `{convidados}` → `campaign_leads.guests`

### 1.5 `recoveryReplaceVariables(text, data)`
- **Arquivo:** `supabase/functions/follow-up-check/index.ts` (linha 1773)
- **Formato suportado:** `{{key}}`, `{{ key }}` e `{key}` (case-insensitive)
- **Mecanismo:** Loop genérico com escape de caracteres especiais (idêntico a `replaceVariables`)
- **Utilizada em:** Stuck Bot Recovery (recuperação de conversas paradas)
- **Variáveis resolvidas:** Dinâmico (baseado no `data` passado)

### 1.6 `interpolateMessage(template, vars)` (Reativação)
- **Arquivo:** `supabase/functions/reactivation-engine/index.ts` (linha 40)
- **Formato suportado:** Apenas `{{key}}` e `{{ key }}` (double braces, case-sensitive)
- **Mecanismo:** Loop genérico, SEM escape de caracteres especiais, SEM suporte a `{key}`
- **Utilizada em:** Motor de reativação inteligente
- **Variáveis resolvidas:**
  - `{{nome}}` → primeiro nome do lead
  - `{{empresa}}` → `companies.name`
  - `{{mes}}` → mês da festa

### 1.7 `interpolateMessage(template, vars)` (Confirmação de Visita)
- **Arquivo:** `supabase/functions/visit-confirmation/index.ts` (linha 10)
- **Formato suportado:** Apenas `{{key}}` e `{{ key }}` (double braces, case-sensitive)
- **Mecanismo:** Idêntico ao da reativação
- **Utilizada em:** Confirmação automática de visitas
- **Variáveis resolvidas:**
  - `{{nome}}` → primeiro nome do lead
  - `{{data_visita}}` → `lead_visits.data_visita` (formatado DD/MM/YYYY)
  - `{{hora_visita}}` → `lead_visits.horario_visita`
  - `{{nome_buffet}}` → `companies.name`

### 1.8 `getNextMessage(messages, index, name, company)`
- **Arquivo:** `src/components/agenda/SendBotDialog.tsx` (linha 23)
- **Formato suportado:** Apenas `{name}` e `{company}` (single brace, case-sensitive)
- **Mecanismo:** `.replace()` fixo inline
- **Utilizada em:** Envio de mensagens do party bot para convidados

### 1.9 `buildMessage(template)` (Escalas para Grupos)
- **Arquivo:** `src/components/freelancer/SendScheduleToGroupsDialog.tsx` (linha 91)
- **Arquivo:** `src/components/freelancer/SendAssignmentsToGroupsDialog.tsx` (linha 112)
- **Formato suportado:** `{key}` (single brace)
- **Mecanismo:** `.replace()` fixo inline
- **Utilizada em:** Envio de escalas e escalações para grupos de WhatsApp
- **Variáveis resolvidas:**
  - `{titulo}`, `{periodo}`, `{qtd_festas}`, `{link}`, `{observacoes}`, `{lista_escalados}`

---

## 2 -- DIFERENÇAS ENTRE AS FUNÇÕES

```text
┌─────────────────────────────┬──────────┬──────────┬──────────┬────────────┐
│ Função                      │ {{key}}  │ {key}    │ Case-ins │ Escape     │
├─────────────────────────────┼──────────┼──────────┼──────────┼────────────┤
│ replaceVariables (webhook)  │ ✅       │ ✅       │ ✅       │ ✅         │
│ replaceVars (flow builder)  │ ✅       │ ✅       │ ✅       │ ❌         │
│ replaceVars (flow timer)    │ ❌       │ ✅       │ ❌       │ ❌         │
│ inline follow-up            │ ❌       │ ✅       │ ❌       │ ❌         │
│ recoveryReplaceVariables    │ ✅       │ ✅       │ ✅       │ ✅         │
│ interpolateMessage (react.) │ ✅       │ ❌       │ ❌       │ ❌         │
│ interpolateMessage (visit)  │ ✅       │ ❌       │ ❌       │ ❌         │
│ getNextMessage              │ ❌       │ ✅       │ ❌       │ ❌         │
│ buildMessage (freelancer)   │ ❌       │ ✅       │ ❌       │ ❌         │
└─────────────────────────────┴──────────┴──────────┴──────────┴────────────┘
```

**Resumo das diferenças:**
- **Formato dual** (`{{}}` + `{}`): Apenas `replaceVariables`, `recoveryReplaceVariables` e `replaceVars` do Flow Builder
- **Formato apenas `{{}}`**: `interpolateMessage` (reativação e visitas)
- **Formato apenas `{}`**: Follow-ups inline, flow timer, party bot, freelancer
- **Case-insensitive**: Apenas 3 das 9 implementações
- **Escape de regex**: Apenas 2 das 9 implementações

---

## 3 -- PONTOS DE INCONSISTÊNCIA

### 3.1 Variáveis da UI sem resolução backend
As variáveis `{hora}` e `{data}` são documentadas na UI de templates (`MessagesSection.tsx`) mas **nenhum motor de follow-up as resolve**. Um admin que use `{hora}` num template verá o texto literal `{hora}` na mensagem enviada.

### 3.2 Formatos incompatíveis entre módulos
Se um admin configura um template de reativação usando `{nome}` (single brace), a `interpolateMessage` da reativação **não resolve** -- ela só aceita `{{nome}}`. Não há validação na UI que force o formato correto.

### 3.3 Nomes de variáveis inconsistentes entre módulos
O mesmo dado "nome da empresa" é referenciado como:
- `{empresa}` (follow-ups)
- `{buffet}` (webhook/flow)
- `{nome-empresa}` (webhook/flow)
- `{company}` (party bot)
- `{{nome_buffet}}` (confirmação de visitas)

### 3.4 Duplicação de código
`replaceVariables` e `recoveryReplaceVariables` são **idênticas** em implementação. `interpolateMessage` é duplicada em dois arquivos com código idêntico.

### 3.5 Flow Timer vs Flow Builder
O `replaceVars` do Flow Builder (webhook) suporta aliases e ambos os formatos. O `replaceVars` do Flow Timer (follow-up-check) suporta apenas `{key}` e um subconjunto diferente de variáveis, sem aliases. Um template de flow que use `{empresa}` funcionará no Builder mas **falhará silenciosamente** no timer timeout.

---

## 4 -- ANÁLISE DE ESCALABILIDADE

### Riscos atuais
1. **Cada novo módulo cria sua própria função** -- padrão já observado 9 vezes
2. **Sem validação** -- variáveis inválidas permanecem como texto literal sem aviso
3. **Sem catálogo central** -- não há uma lista canônica de variáveis disponíveis por contexto
4. **Contratos futuros** precisarão de dezenas de variáveis novas (CPF, endereço, valor, pacote, data do evento, etc.) -- o modelo atual forçará a criação de mais uma função isolada

### Impacto
Para cada nova funcionalidade (contratos, novos bots, novas automações), o desenvolvedor precisa:
1. Descobrir quais funções existem
2. Escolher qual copiar
3. Decidir qual formato usar
4. Adicionar as variáveis manualmente

Isso gera **drift** inevitável entre módulos.

---

## 5 -- SUGESTÃO DE ARQUITETURA (CONCEITUAL)

### Proposta: `resolveSystemVariables(template, context)`

Uma única função utilitária compartilhada (ex: `supabase/functions/_shared/interpolate.ts`) que:

1. **Aceita ambos os formatos** (`{{key}}` e `{key}`) sempre
2. **Usa um registro central de variáveis** mapeando alias para chave canônica (ex: `empresa` = `buffet` = `nome_buffet` = `company`)
3. **Recebe um contexto tipado** com entidades opcionais:

```text
context: {
  lead?: { name, phone, month, guests, unit }
  company?: { name }
  visit?: { date, time }
  event?: { date, title, guests }
  freelancer?: { assignments, schedule_link }
}
```

4. **Resolve automaticamente** derivados (ex: `primeiro_nome` a partir de `lead.name`)
5. **Loga variáveis não resolvidas** em vez de deixá-las como texto literal

### Benefícios
- Uma única fonte de verdade
- Novos módulos (contratos, etc.) apenas passam o contexto e usam a mesma função
- Aliases centralizados eliminam inconsistências
- Possibilidade de validação na UI (mostrar apenas variáveis disponíveis para cada contexto)

### Migração
Seria gradual -- cada Edge Function importaria a função compartilhada e removeria sua implementação local. Sem breaking changes, pois a nova função suportaria todos os formatos existentes.

---

*Este relatório é apenas analítico. Nenhuma alteração foi feita no código.*

