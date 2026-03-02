

## Aba separada para Escalas de Periodo Livre

### Problema
Hoje, todas as escalas (semanais e de periodo livre) aparecem agrupadas por semana. Escalas com periodos livres (ex: 13/03 - 15/03) acabam aparecendo dentro de uma semana especifica, o que pode confundir. O ideal e separar visualmente.

### Solucao

Adicionar um toggle de duas abas no topo da listagem de escalas:

```text
  [ Semanal ]  [ Periodo livre ]
```

- **Semanal**: Exibe o agrupamento por semanas do mes (comportamento atual)
- **Periodo livre**: Lista as escalas livres em ordem cronologica, sem agrupamento semanal

### Como distinguir os dois tipos

1. Adicionar uma coluna `schedule_type` (`text`, default `'week'`) na tabela `freelancer_schedules` para registrar se a escala foi criada como `'week'` ou `'free'`
2. No `CreateScheduleDialog`, salvar o `mode` atual (`"week"` ou `"free"`) nesse campo ao criar a escala
3. Na listagem, filtrar as escalas pelo tipo selecionado na aba

### Arquivos modificados

- **Migracao SQL** -- Adicionar coluna `schedule_type text default 'week'` na tabela `freelancer_schedules`
- **`src/components/freelancer/CreateScheduleDialog.tsx`** -- Incluir `schedule_type: mode` no insert
- **`src/components/freelancer/FreelancerSchedulesTab.tsx`** -- Adicionar estado `viewMode` com toggle de abas. Na aba "Semanal", manter o agrupamento por semanas. Na aba "Periodo livre", exibir as escalas do tipo `free` em lista simples ordenada por data, com os mesmos cards e acoes
- **`src/integrations/supabase/types.ts`** -- Atualizar os tipos para incluir `schedule_type`

### Detalhe tecnico

```text
FreelancerSchedulesTab:
  viewMode: "week" | "free" = "week"

  schedulesFiltered = schedules.filter(s => 
    (s.schedule_type || "week") === viewMode
  )

  SE viewMode === "week":
    renderizar agrupamento semanal (como hoje)
  SE viewMode === "free":
    renderizar lista simples ordenada por start_date
    cada card mostra o periodo (dd/MM - dd/MM) sem header de semana

CreateScheduleDialog (insert):
  schedule_type: mode  // "week" ou "free"

Escalas antigas (sem schedule_type) serao tratadas como "week" 
por default, mantendo compatibilidade.
```

### Resultado
- Buffets que usam periodo livre veem suas escalas separadas, sem confusao com semanas
- Buffets que usam so semana fixa nao percebem mudanca (aba semanal vem selecionada por padrao)
- Escalas antigas continuam aparecendo na aba semanal

