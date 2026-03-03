

## Plano: Otimizar performance da tela de Inteligência

### Diagnóstico

A lentidão tem 3 causas principais:

1. **`useLeadIntelligence`** busca TODOS os registros de `lead_intelligence` + TODOS os `campaign_leads` da empresa sem limite -- pode ser centenas/milhares de registros
2. **`FollowUpsTab`** busca TODO o `lead_history` de follow-ups sem filtro de data -- acumula registros infinitamente ao longo do tempo
3. **`InlineAISummary`** renderiza em CADA card e pode disparar queries individuais ao expandir

### Mudanças propostas

#### 1. Limitar `lead_history` no FollowUpsTab (maior impacto)
**Arquivo: `src/components/inteligencia/FollowUpsTab.tsx`**
- Adicionar filtro `.gte("created_at", last90days)` na query de `lead_history` -- não faz sentido buscar follow-ups de meses atrás
- Adicionar `.limit(500)` como safety net

#### 2. Filtrar apenas leads ativos no `useLeadIntelligence`
**Arquivo: `src/hooks/useLeadIntelligence.ts`**
- Na query de `campaign_leads`, excluir leads com status `fechado` e `perdido` (já finalizados) para reduzir volume
- Adicionar `.limit(500)` na query de `lead_intelligence`

#### 3. Paginação visual no FollowUpsTab
**Arquivo: `src/components/inteligencia/FollowUpsTab.tsx`**
- Limitar exibição a 20 leads por coluna inicialmente
- Adicionar botão "Ver mais" que carrega +20 leads
- Isso evita renderizar centenas de cards DOM de uma vez

#### 4. Lazy render do InlineAISummary
**Arquivo: `src/components/inteligencia/FollowUpsTab.tsx`**
- O `InlineAISummary` já é expandível, mas está sendo montado em cada card. Manter apenas o botão trigger e montar o componente completo somente ao expandir (renderização condicional)

### O que NÃO muda
- Nenhuma Edge Function
- Nenhuma tabela do banco
- Nenhuma instância W-API
- Apenas otimizações frontend de queries e renderização

