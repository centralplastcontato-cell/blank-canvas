

## Indicador de Pendência Financeira nos Cards da Agenda

### O que será feito

Adicionar um indicador visual compacto nos cards de evento do painel lateral da Agenda (sidebar do dia selecionado) que mostra se a festa possui parcelas pendentes ou em atraso, sem necessidade de abrir o detalhe do evento.

### Como vai funcionar

- Ao selecionar um dia no calendário, os cards de evento já exibem informações como horário, unidade, convidados, valor e checklist.
- Será adicionado um novo indicador abaixo dessas informações mostrando:
  - **Parcela em atraso**: ícone vermelho com texto "X parcela(s) em atraso"
  - **Parcela pendente**: ícone laranja com texto "X parcela(s) pendente(s)"
  - **Tudo pago**: ícone verde discreto com "Pago" (somente se existirem parcelas)
- O indicador usa cores semânticas consistentes com o padrão visual do sistema.

### Detalhes técnicos

#### 1. Buscar dados de pagamento para eventos do mês (`src/pages/Agenda.tsx`)
- Após carregar os eventos (`fetchEvents`), fazer uma query complementar em `event_payments` para todos os `event_id`s do mês visível.
- Agrupar por `event_id` e calcular: total de parcelas, quantas pagas, quantas pendentes, quantas em atraso (due_date < hoje e status != paid).
- Armazenar em um `Record<string, { total: number; paid: number; pending: number; late: number }>` via `useState`.

#### 2. Renderizar indicador no card do evento (sidebar)
- No bloco onde já são renderizados checklist progress e conflitos (linhas ~1856-1866), adicionar uma linha condicional:
  - Se `late > 0`: badge vermelho "X em atraso"
  - Senão se `pending > 0`: badge laranja "X pendente(s)"
  - Senão se `paid > 0 && paid === total`: badge verde "Pago"
- Usar ícone `DollarSign` ou `Banknote` para consistência.

#### 3. Atualizar AgendaListView (opcional)
- Aplicar a mesma lógica na visão de lista (`AgendaListView.tsx`), caso o mesmo padrão de exibição seja desejado.

### Arquivos alterados
- `src/pages/Agenda.tsx` — fetch de payment status + renderização no card lateral

### Resultado esperado
O operador visualiza imediatamente no card da festa (sidebar do calendário) se há pendências financeiras, sem precisar abrir o detalhe do evento.

