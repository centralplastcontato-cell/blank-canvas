

## Correção: Permitir mesmo dia em colunas com turnos diferentes

### Problema
Na configuração da Grade de Preços, ao marcar "Sáb" na coluna "Sáb e Dom Almoço" (turno Almoço), o sistema remove "Sáb" da coluna "Sáb Jantar e Feriado" (turno Jantar), e vice-versa. Isso acontece porque a lógica atual trata o mapeamento de dias como exclusivo entre colunas, sem considerar que turnos diferentes permitem compartilhar o mesmo dia.

### Solução
Alterar a função `toggleDayMapping` no `PriceGridConfigDialog.tsx` para só remover um token de outra coluna quando ambas as colunas tiverem o **mesmo turno** (ou nenhum turno definido). Se os turnos forem diferentes (ex: uma é "almoco" e outra é "jantar"), o mesmo dia pode existir em ambas.

### Alteração técnica

**Arquivo:** `src/components/admin/PriceGridConfigDialog.tsx`

Na função `toggleDayMapping` (linhas 86-101), a lógica de remoção exclusiva (linhas 88-91) será ajustada para comparar o turno da coluna sendo editada com o turno das outras colunas:

- Se a coluna atual tem turno "almoco" e outra coluna tem turno "jantar" (ou vice-versa), **não** remove o token da outra coluna.
- Se ambas as colunas têm o mesmo turno (ou ambas são "any"/indefinido), mantém o comportamento atual de exclusividade.

Também será ajustada a lógica correspondente no `getDayType` em `brazilian-holidays.ts` para garantir que, ao resolver o tipo de dia para precificação, colunas com turno específico só sejam selecionadas quando o turno do evento corresponder.

### Resultado esperado
O admin poderá marcar "Sáb" tanto na coluna de Almoço quanto na de Jantar. O sistema usará o turno do evento para selecionar o preço correto.

