

## Filtro "Hoje" ativado por padrão no CRM

### O que muda
Ao entrar na aba de Leads/CRM na Central de Atendimento, o filtro "Hoje" ja vai estar ativado automaticamente, mostrando apenas os leads do dia. Para ver todos os leads, basta clicar no botao "Hoje" para desativar.

### Alteracoes tecnicas

**1. `src/pages/CentralAtendimento.tsx`**
- Alterar o estado inicial dos filtros para que `startDate` e `endDate` comecem com a data de hoje (em vez de `undefined`)
- Mesma logica: `const today = new Date(); today.setHours(0,0,0,0);` e inicializar `startDate: today, endDate: today`

**2. `src/pages/Admin.tsx`**
- Aplicar a mesma alteracao no estado inicial dos filtros, para manter consistencia caso a pagina Admin tambem seja usada

**3. `src/components/admin/LeadsFilters.tsx`**
- Nenhuma alteracao necessaria -- o componente ja detecta automaticamente se as datas correspondem a "hoje" e destaca o botao. A logica de toggle (clicar para desativar) tambem ja existe.

### Resultado
- Ao abrir o CRM, apenas leads criados hoje aparecem
- O botao "Hoje" aparece ativo (amarelo) por padrao
- Clicar nele desativa o filtro e mostra todos os leads
- Comportamento identico ao atual, apenas com o estado inicial invertido

