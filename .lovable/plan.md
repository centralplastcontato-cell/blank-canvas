

## Análise: Queries de `lead_history` vulneráveis ao limite de 1000 registros do Supabase

### Contexto
O Supabase retorna no máximo **1000 registros** por query quando `.limit()` não é especificado. Se uma empresa tiver muitos leads/ações, os resultados serão silenciosamente truncados, causando dados incompletos sem erro.

### Queries afetadas

| Local | Filtro | `.limit()` | Risco |
|---|---|---|---|
| `Admin.tsx` (linhas 269-293) | 6 queries paralelas por `action` específica, filtradas por `leadIds` da página | Nenhum | **Baixo** — filtram por IDs da página atual (paginada, ~50 leads) |
| `CentralAtendimento.tsx` (linhas 322-347) | Idêntico ao Admin.tsx | Nenhum | **Baixo** — mesma lógica paginada |
| `FollowUpsTab.tsx` (linha 138-145) | `company_id` + 5 actions + últimos 90 dias | `.limit(500)` | **Médio** — já tem limit, mas 500 pode ser insuficiente para empresas grandes |
| `useLeadStageDurations.ts` (linhas 22-28) | `company_id` + `status_change` + 90 dias | `.limit(2000)` | **Baixo** — limit explícito e aceita amostragem |
| `daily-summary` EF (linha 149-156) | `company_id` + dia específico + 2 actions | Nenhum | **Médio** — dia movimentado pode ultrapassar 1000 |
| `daily-summary` EF (linha 287-293) | `company_id` + dia + todas ações | `.limit(100)` | **OK** — limit intencional |
| `daily-summary` EF (linha 588-595) | `company_id` + dia + follow-up actions | Nenhum | **Baixo** — filtrado por dia + 4 actions |
| `follow-up-check` EF (linhas 452-454) | `instance_id` implícito via company + janela tempo | Nenhum | **Médio** — janela pode ser ampla |
| `LeadDetailSheet.tsx` (linha 111) | Filtrado por `lead_id` individual | Nenhum | **Muito baixo** — histórico de 1 lead |

### Queries que precisam de correção

**1. `Admin.tsx` e `CentralAtendimento.tsx`** — As 6 queries paralelas de follow-up/visit
- Risco real: baixo porque filtram por `.in("lead_id", leadIds)` onde `leadIds` vem da página paginada (~50 leads)
- Cada lead tem no máximo 1 registro por action → máximo ~50 resultados por query
- **Não precisa de correção**

**2. `FollowUpsTab.tsx`** — `.limit(500)` pode truncar
- Empresas com muitos leads nos últimos 90 dias podem ter >500 eventos de follow-up
- **Correção**: Aumentar limit para 2000 (já é o padrão usado em `useLeadStageDurations`)

**3. `daily-summary` EF** — Query de `statusChanges` sem limit
- Em dias muito movimentados, pode ultrapassar 1000 status changes
- **Correção**: Adicionar `.limit(5000)` como safety net

**4. `follow-up-check` EF** — Queries de `analysisChoices` sem limit
- A janela dinâmica (`delayHours * 2, mínimo 168h`) pode capturar muitos registros
- **Correção**: Adicionar `.limit(5000)` nas queries de busca

### Plano de implementação

**`src/components/inteligencia/FollowUpsTab.tsx`**
- Linha 145: Alterar `.limit(500)` para `.limit(2000)`

**`supabase/functions/daily-summary/index.ts`**
- Linha 156 (query `statusChanges`): Adicionar `.limit(5000)`
- Linha 595 (query `followUpEvents`): Adicionar `.limit(5000)`

**`supabase/functions/follow-up-check/index.ts`**
- Nas queries de `analysisChoices` e `inactiveLeads` (linhas ~452 e ~475): Adicionar `.limit(5000)`
- Nas queries de `existingFollowUps` e `previousFollowUps` (linhas ~512, ~528): Já filtram por `leadIds` obtidos acima, risco baixo, mas adicionar `.limit(5000)` por segurança

### Resumo
- 3 arquivos alterados
- 2 edge functions precisam redeploy
- Zero impacto em funcionalidade — apenas garante que os dados não sejam truncados silenciosamente

