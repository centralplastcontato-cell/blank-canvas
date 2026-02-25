

## Corrigir carregamento lento do modulo Inteligencia

### Problema
A pagina de Inteligencia exibe uma tela em branco por varios segundos antes de mostrar qualquer conteudo. Isso acontece por causa de uma cascata de chamadas assincronas sequenciais e pela falta de feedback visual durante o carregamento.

### Causas identificadas

1. **Tela em branco quando a empresa ainda nao carregou**: O hook `useDailySummary` retorna silenciosamente quando `currentCompany` e `null`, sem ativar nenhum estado de loading. Resultado: a tela fica completamente vazia.

2. **Cascata de chamadas sequenciais**: Primeiro o `CompanyContext` carrega (auth + queries), depois a pagina `Inteligencia` faz sua propria verificacao de auth (4 queries), e so entao o `ResumoDiarioTab` chama a Edge Function `daily-summary` que faz mais 5+ queries.

3. **Sem skeleton no ResumoDiarioTab enquanto a empresa carrega**: O componente nao verifica o `isLoading` do contexto da empresa.

### Solucao

#### 1. Mostrar skeleton imediatamente no ResumoDiarioTab
- Verificar `CompanyContext.isLoading` no componente e mostrar skeleton enquanto a empresa carrega
- Isso elimina a tela em branco

#### 2. Iniciar loading automaticamente no useDailySummary
- Iniciar `isLoading=true` por padrao (em vez de `false`) para que o skeleton apareca desde o primeiro render
- Quando `currentCompany` ainda nao esta disponivel, manter o estado de loading ativo

#### 3. Mostrar skeleton na pagina Inteligencia durante carregamento de permissoes
- Adicionar skeleton no componente pai enquanto `permLoading` e `CompanyContext.isLoading` estao ativos

### Detalhes tecnicos

**Arquivo: `src/hooks/useDailySummary.ts`**
- Mudar `useState(false)` para `useState(true)` no `isLoading` inicial
- Quando `currentCompany?.id` nao esta disponivel, nao resetar `isLoading` para `false` prematuramente

**Arquivo: `src/components/inteligencia/ResumoDiarioTab.tsx`**
- Importar `useCompany` e verificar `isLoading` do contexto
- Mostrar skeleton quando `companyIsLoading || (isLoading && !data)`

**Arquivo: `src/pages/Inteligencia.tsx`**
- Verificar `CompanyContext.isLoading` e mostrar skeleton geral enquanto carrega

### Resultado esperado
O usuario vera skeletons animados imediatamente ao abrir a pagina, em vez de uma tela completamente em branco. A percepcao de velocidade melhora significativamente mesmo que o tempo total de carregamento seja o mesmo.

