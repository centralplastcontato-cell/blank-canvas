

## Calendario Semanal para Escalas de Freelancer

### O que muda
Transformar a listagem plana de escalas em uma visualizacao organizada por **mes e semanas**, com navegacao mensal e resumo.

### Layout

```text
+--------------------------------------------------+
|  < Fevereiro 2026 >              [+ Nova Escala]  |
+--------------------------------------------------+
|  3 escalas · 8 festas · 5 escalados               |
+--------------------------------------------------+
|                                                    |
|  SEMANA 1 · 02/03 - 08/03                         |
|  +----------------------------------------------+ |
|  | Escala Carnaval  | Ativa | 5 festas | 02-05  | |
|  | [copiar] [pdf] [excluir]           [expandir] | |
|  +----------------------------------------------+ |
|                                                    |
|  SEMANA 2 · 09/03 - 15/03                         |
|  Nenhuma escala nesta semana                       |
|                                                    |
|  SEMANA 3 · 16/03 - 22/03                         |
|  +----------------------------------------------+ |
|  | Escala Marco P2  | Ativa | 3 festas | 16-20  | |
|  +----------------------------------------------+ |
|  +----------------------------------------------+ |
|  | Escala VIP       |       | 2 festas | 18-22  | |
|  +----------------------------------------------+ |
+--------------------------------------------------+
```

### Arquivo editado
`src/components/freelancer/FreelancerSchedulesTab.tsx`

### Mudancas

1. **Novo estado `currentMonth`** (Date) para navegacao mensal, inicializado com o mes atual.

2. **Navegador de mes** no header: botoes ChevronLeft/ChevronRight com nome do mes em portugues (ex: "Marco 2026").

3. **Resumo mensal** logo abaixo do header: cards compactos mostrando total de escalas, festas e freelancers escalados no mes filtrado.

4. **Agrupamento por semana** usando `eachWeekOfInterval`, `startOfWeek`, `endOfWeek` do `date-fns`:
   - Calcula as semanas do mes selecionado
   - Filtra escalas cujo intervalo `[start_date, end_date]` intersecta cada semana (via `areIntervalsOverlapping`)
   - Renderiza container visual por semana com label "Semana N - dd/MM a dd/MM"

5. **Semanas vazias** mostram texto discreto "Nenhuma escala nesta semana" em cor muted.

6. **Cards de escala** mantem toda funcionalidade atual (expandir, copiar link, PDF, excluir, ver disponibilidade, escalar freelancers).

7. **Sem mudancas no banco de dados** - apenas reorganizacao visual.

### Detalhes tecnicos

- Imports adicionais do `date-fns`: `startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `eachWeekOfInterval`, `areIntervalsOverlapping`, `addMonths`, `subMonths`
- Imports adicionais do `lucide-react`: `ChevronLeft`, `ChevronRight`, `CalendarDays`
- Filtro de escalas por mes: escala aparece no mes se seu intervalo intersecta o intervalo do mes
- Locale `ptBR` ja importado, usado para formatar nome do mes

