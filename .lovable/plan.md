

## Plano: Adicionar coluna "Auto-Perdido" ao Kanban de Follow-ups

### Problema
O painel de Follow-ups mostra apenas as colunas de envio (1º ao 4º), mas não mostra o desfecho final: leads que foram automaticamente movidos para "Perdido" após o último follow-up. Quando o Auto-Perdido está ativado nas configurações, faz sentido mostrar essa coluna para completar a visualização do funil.

### Solução

**Arquivo: `src/components/inteligencia/FollowUpsTab.tsx`**

1. **Adicionar coluna 5 ao `COLUMN_CONFIG`** com `fuNumber: 5`, label "Auto-Perdido", cor vermelha escura (`border-l-rose-700`), e ícone `Power` (consistente com o painel de configurações)

2. **Buscar leads perdidos automaticamente**: Incluir a action `"Lead marcado como perdido automaticamente"` na query de `lead_history`, e atribuir `fuNumber = 5` para esses leads

3. **Remover o filtro que exclui leads "perdido"**: Atualmente a query filtra `.not("status", "in", '("fechado","perdido")')` — para leads com `fuNumber = 5`, permitir que passem (já que são exatamente os perdidos que queremos mostrar)

4. **Controlar visibilidade via `auto_lost_enabled`**: Buscar esse campo junto com os demais no select de `wapi_bot_settings`, e usar `isColumnEnabled(5)` retornando `true` apenas quando `auto_lost_enabled === true` na instância selecionada

5. **Ajustar label de delay**: Para a coluna 5, mostrar o `auto_lost_delay_hours` (ex: "48h após último FU")

6. **Buscar `auto_lost_delay_hours`** no select da query e incluir no `InstanceDelays`

### Detalhes técnicos

- O `InstanceDelays` ganha campos `autoLostEnabled: boolean` e `autoLostDelay: number`
- A action no histórico é `"Lead marcado como perdido automaticamente"` (conforme `follow-up-check/index.ts`)
- O grid responsivo já se adapta dinamicamente ao número de colunas visíveis (implementado na última alteração)

