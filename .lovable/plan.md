

## Diagnóstico: Abas da Inteligência em branco

### Causa raiz identificada

O problema é uma **condição de corrida** entre o controle do `enabled` do react-query e a renderização das abas.

Quando o usuário está na aba "Resumo do Dia", a query `useLeadIntelligence` fica **desabilitada** (`enabled: false`). Nesse estado, react-query v5 retorna:
- `isLoading = false` (não está carregando porque está desabilitada)
- `data = undefined` (nunca buscou dados)

Ao trocar para qualquer outra aba, `enabled` vira `true`, mas no **mesmo ciclo de render**, `isLoading` ainda é `false` e `data` continua `undefined`. O código atual verifica apenas `isLoading`:

```tsx
{isLoading ? <LoadingSkeleton /> : <PrioridadesTab data={filteredData} />}
```

Como `isLoading=false`, renderiza o componente com `filteredData = []` (vazio). Em seguida o react-query atualiza para `isLoading=true` (skeleton), mas se a query falhar ou demorar muito, a aba fica presa entre estados.

Além disso, `useLeadStageDurations` busca **TODO** o histórico de status_change sem limite, o que pode causar timeout em empresas com muitos leads.

### Plano de correção

#### 1. Corrigir condição de renderização em `src/pages/Inteligencia.tsx`

Adicionar verificação `!data` junto com `isLoading` para garantir que o skeleton mostre enquanto dados não existem:

```tsx
// De:
{isLoading || isLoadingUnitPerms || permLoading ? <LoadingSkeleton /> : <Tab ... />}

// Para:
{isLoading || !data || isLoadingUnitPerms || permLoading ? <LoadingSkeleton /> : <Tab ... />}
```

Aplicar em todas as 4 abas que dependem de `data` (Prioridades, Follow-ups, Funil, Leads do Dia).

#### 2. Otimizar `useLeadStageDurations` em `src/hooks/useLeadStageDurations.ts`

Adicionar filtro de 90 dias e limite de 2000 registros na query de `lead_history`, igual ao que fizemos no FollowUpsTab:

```tsx
.gte('created_at', subDays(new Date(), 90).toISOString())
.limit(2000)
```

#### 3. Pré-carregar dados de inteligência

Mudar `needsIntelligence` para sempre `true` após a primeira troca de aba, evitando o delay de habilitação. Alternativamente, simplesmente remover o gate `needsIntelligence` e sempre buscar os dados (o `staleTime: 60_000` já evita re-fetches desnecessários):

```tsx
// Remover: const needsIntelligence = activeTab !== "resumo";
// Usar: useLeadIntelligence(true) — sempre habilitado
```

Isso garante que ao trocar de aba os dados já estejam disponíveis.

### O que NÃO muda
- Nenhuma Edge Function, tabela ou instância W-API
- Apenas correções de lógica de renderização e otimização de queries frontend

