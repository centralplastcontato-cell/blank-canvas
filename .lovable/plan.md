

## Painel de Gerenciamento de Consumo de IA no Hub

### Objetivo
Criar uma nova pagina no Hub (`/hub/consumo-ia`) que permite ao admin global visualizar o consumo de chamadas de IA por empresa, funcao e periodo, com possibilidade de ativar/desativar IA por empresa.

### Arquitetura

```text
+-------------------+       +---------------------+       +-------------------+
| Edge Functions    | --->  | ai_usage_logs       | <---  | HubAIUsage page   |
| (4 funcoes com IA)|       | (nova tabela)       |       | (nova pagina Hub) |
+-------------------+       +---------------------+       +-------------------+
```

**Funcoes que usam IA (todas com gpt-4o-mini):**
1. `lead-summary` - Resumos de conversas
2. `daily-summary` - Resumos diarios automaticos
3. `fix-text` - Correcao de texto
4. `wapi-webhook` - Qualificacao no Flow Builder

### Mudancas

#### 1. Nova tabela: `ai_usage_logs`
Tabela para registrar cada chamada de IA com:
- `id` (uuid, PK)
- `company_id` (uuid, FK companies)
- `function_name` (text) - ex: "lead-summary", "fix-text"
- `model` (text) - ex: "gpt-4o-mini"
- `prompt_tokens` (integer)
- `completion_tokens` (integer)
- `total_tokens` (integer)
- `estimated_cost_usd` (numeric) - calculado com base nos tokens
- `created_at` (timestamptz)
- RLS: somente admins globais podem ler

#### 2. Atualizar 4 Edge Functions para logar uso
Cada funcao que chama a OpenAI API vai inserir um registro na `ai_usage_logs` apos receber a resposta, usando os dados de `usage` que a OpenAI retorna (prompt_tokens, completion_tokens).

**Funcoes a atualizar:**
- `supabase/functions/lead-summary/index.ts`
- `supabase/functions/daily-summary/index.ts`
- `supabase/functions/fix-text/index.ts`
- `supabase/functions/wapi-webhook/index.ts`

Em cada uma, apos o `fetch` a OpenAI:
```text
const aiData = await aiResp.json();
// Inserir log de uso
await supabase.from('ai_usage_logs').insert({
  company_id,
  function_name: 'lead-summary',
  model: 'gpt-4o-mini',
  prompt_tokens: aiData.usage?.prompt_tokens,
  completion_tokens: aiData.usage?.completion_tokens,
  total_tokens: aiData.usage?.total_tokens,
  estimated_cost_usd: calculateCost(aiData.usage)
});
```

#### 3. Nova pagina: `src/pages/HubAIUsage.tsx`
Pagina no Hub com:
- **Cards de KPI**: Total de chamadas, tokens consumidos, custo estimado (periodo selecionado)
- **Filtros**: Periodo (7d, 30d, 90d), empresa especifica ou todas
- **Tabela por empresa**: Nome, total chamadas, tokens, custo estimado, ultima chamada
- **Grafico de barras**: Consumo por funcao (lead-summary vs fix-text vs daily-summary vs webhook)
- **Toggle por empresa**: Ativar/desativar IA (usando campo `ai_enabled` no settings da empresa)

#### 4. Modulo `ai_enabled` no settings da empresa
Adicionar um campo `ai_enabled` no `companies.settings` (default true). As edge functions verificam esse campo antes de chamar a OpenAI - se desabilitado, pulam a chamada e retornam resposta padrao.

#### 5. Rota e navegacao
- Adicionar rota `/hub/consumo-ia` no `App.tsx`
- Adicionar item "Consumo IA" no `HubSidebar.tsx` e `HubMobileMenu.tsx` com icone `Brain`

### Arquivos novos
1. `src/pages/HubAIUsage.tsx` - Pagina principal do painel

### Arquivos modificados
1. `src/App.tsx` - Nova rota `/hub/consumo-ia`
2. `src/components/hub/HubSidebar.tsx` - Novo item de menu
3. `src/components/hub/HubMobileMenu.tsx` - Novo item de menu mobile
4. `supabase/functions/lead-summary/index.ts` - Log de uso apos chamada OpenAI
5. `supabase/functions/daily-summary/index.ts` - Log de uso apos chamada OpenAI
6. `supabase/functions/fix-text/index.ts` - Log de uso apos chamada OpenAI
7. `supabase/functions/wapi-webhook/index.ts` - Log de uso apos chamada OpenAI (2 pontos de chamada)

### Custo estimado por chamada (gpt-4o-mini)
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Esses valores serao usados para calcular o `estimated_cost_usd` automaticamente

### Nota
O tracking comeca a partir do momento da implantacao - nao ha dados historicos. O painel mostrara dados apenas de chamadas futuras.
