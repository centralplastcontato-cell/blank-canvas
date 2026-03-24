

# Unificar Calendário — Vendas 1/2 como Canal, não Unidade Física

## Problema
"Vendas 1" e "Vendas 2" são instâncias de vendas (canais WhatsApp), não locais físicos distintos. Ao filtrar por uma delas, os dados ficam zerados ou incompletos porque os eventos não estão distribuídos uniformemente entre elas. O calendário deveria mostrar tudo unificado.

## Solução

### Abordagem
Quando a empresa tem apenas unidades do tipo "canal de vendas" (e não locais físicos distintos), o filtro de unidade na Agenda deve ser **ocultado** ou convertido em filtro secundário opcional. Os KPIs e o calendário mostram sempre a visão consolidada.

### Mudanças em `src/pages/Agenda.tsx`

1. **Detectar se unidades são canais de venda vs locais físicos**
   - Se todas as unidades ativas contêm "Vendas" no nome (ou são ≤2 e seguem esse padrão), tratar como canal de vendas
   - Nesse caso: ocultar o seletor de unidade do header e mostrar dados unificados (manter `selectedUnit = "all"` fixo)

2. **Manter unidade no formulário de evento**
   - Ao criar/editar festa, o campo "Unidade" continua disponível para o usuário indicar por qual canal (Vendas 1 ou 2) o lead entrou
   - Isso preserva a rastreabilidade sem fragmentar a visualização

3. **Lógica de detecção** (simples):
   ```
   const isSalesChannelOnly = physicalUnits.length > 0 && 
     physicalUnits.every(u => u.name.toLowerCase().includes("vendas"));
   ```
   - Se `isSalesChannelOnly` → não renderiza o `Select` de unidades no header (desktop e mobile)
   - Os `filteredEvents` e `filteredPeriodEvents` usam sempre "all"

4. **Cards de resumo e "Fechadas"**
   - Mostram totais consolidados (já funciona quando `selectedUnit = "all"`)

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Agenda.tsx` | Adicionar flag `isSalesChannelOnly`, condicionar renderização do seletor de unidade, forçar `selectedUnit = "all"` quando flag ativa |

### O que NÃO muda
- `EventFormDialog` — campo unidade continua disponível para registro
- `company_units` — nenhuma alteração na tabela
- Lógica de permissões por unidade — preservada para empresas com múltiplos locais físicos
- Todas as outras páginas que usam unidades

