
## Melhorar layout do calendario no desktop

### Problema
O calendario da Agenda no desktop esta com celulas, fontes e espacamentos muito pequenos, nao aproveitando bem o espaco disponivel da tela.

### Mudancas

**Arquivo: `src/components/agenda/AgendaCalendar.tsx`**

1. Aumentar a altura das celulas dos dias de `h-10` para `h-14 lg:h-20` no desktop
2. Aumentar o tamanho da fonte do numero do dia
3. Aumentar o tamanho dos dots de status de `h-1.5 w-1.5` para `lg:h-2 lg:w-2`
4. Aumentar o espacamento entre linhas (`mt-1` para `lg:mt-2`)
5. Aumentar a fonte do cabecalho (dias da semana) e do titulo do mes
6. Aumentar o padding geral do componente no desktop

**Arquivo: `src/pages/Agenda.tsx`**

1. Alterar o grid de `lg:grid-cols-3` para `lg:grid-cols-[2fr_1fr]` para dar mais espaco ao calendario em relacao ao painel lateral
2. Aumentar o padding do card do calendario no desktop

### Resultado esperado
O calendario ocupara mais espaco horizontal e vertical, com celulas maiores e mais legíveis, mantendo a aparencia compacta no mobile.
