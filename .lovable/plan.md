

## Modo "Semana Livre" na criacao de escalas

### Objetivo
Permitir que o buffet escolha entre dois modos ao criar uma escala:
1. **Semana fechada** (atual) -- seleciona uma semana pre-definida do mes
2. **Periodo livre** (novo) -- seleciona manualmente uma data inicial e final usando date pickers

### Como vai funcionar

No topo da secao "Semana", adicionar um toggle (duas abas) para alternar entre os modos:

```text
  [ Semana fixa ]  [ Periodo livre ]
```

- **Semana fixa**: Comportamento atual, com o grid de semanas do mes.
- **Periodo livre**: Substitui o grid por dois campos de data (De / Ate) usando o componente Calendar em popovers. O titulo e auto-sugerido como "Escala dd/MM - dd/MM". As festas sao buscadas pelo range escolhido.

O restante do dialog (lista de festas, observacoes, botao criar) permanece identico -- a unica mudanca e como o `startDate` e `endDate` sao definidos.

### Arquivo modificado

**`src/components/freelancer/CreateScheduleDialog.tsx`**

1. Adicionar estado `mode: "week" | "free"` (default: `"week"`)
2. Renderizar toggle com dois botoes no topo da secao de periodo
3. No modo `"free"`:
   - Exibir dois popovers com `Calendar mode="single"` para data inicial e final
   - Auto-sugerir titulo: `Escala {dd/MM} - {dd/MM}`
   - Buscar festas pelo range livre (mesma query que ja existe)
4. No modo `"week"`: manter comportamento atual sem mudancas
5. Unificar `startDate`/`endDate` -- ambos os modos alimentam as mesmas variaveis que ja controlam a busca de eventos e o submit

### Detalhe tecnico

```text
Estado:
  mode: "week" | "free" = "week"
  freeFrom: Date | undefined
  freeTo: Date | undefined

startDate / endDate derivados:
  SE mode === "week":
    startDate = weeks[selectedWeek]?.start
    endDate = weeks[selectedWeek]?.end
  SE mode === "free":
    startDate = freeFrom
    endDate = freeTo

Titulo auto-sugerido (modo livre):
  "Escala {format(freeFrom, 'dd/MM')} - {format(freeTo, 'dd/MM')}"

Reset ao trocar de modo:
  - Limpar selectedWeek, freeFrom, freeTo, events, selectedEventIds, title
```

### Resultado
- Buffets que preferem periodos customizados (ex: quinzena, 10 dias, mes inteiro) podem criar escalas sem ficar preso a semanas
- Nenhuma mudanca no banco de dados -- `freelancer_schedules` ja armazena `start_date` e `end_date` como campos livres
- A pagina publica do freelancer continua funcionando normalmente pois le o range salvo

