

## Ocultar Faturamento na Agenda por Permissão

### O que será feito
Adicionar uma permissão `agenda.faturamento` no sistema. Quando **não concedida**, o card de "Faturamento Confirmado" ficará oculto na Agenda. O campo "Valor total (R$)" no formulário de criação/edição de festa continuará visível para todos.

### Como funciona

1. **Nova permissão no banco** — Inserir uma linha em `permission_definitions`:
   - `code: 'agenda.faturamento'`, `category: 'agenda'`, `name: 'Ver faturamento'`
   - Admins/owners ignoram essa restrição (já é o comportamento padrão do sistema de permissões)

2. **Agenda.tsx** — Buscar se o usuário tem `agenda.faturamento` usando o hook `useConfigPermissions` ou `useUserPermissions`. Passar uma prop `showRevenue` para `MonthSummaryCards`.

3. **MonthSummaryCards.tsx** — Receber `showRevenue?: boolean` (default `true`). Quando `false`, ocultar o card de faturamento confirmado. A ocupação e os 4 KPI cards continuam visíveis.

4. **EventFormDialog.tsx** — Nenhuma alteração. O campo "Valor total (R$)" permanece disponível para todos os usuários.

### Arquivos modificados
- `supabase/migrations/` — Nova migration para inserir a `permission_definition`
- `src/pages/Agenda.tsx` — Checar permissão e passar `showRevenue` prop
- `src/components/agenda/MonthSummaryCards.tsx` — Aceitar e usar `showRevenue` prop

