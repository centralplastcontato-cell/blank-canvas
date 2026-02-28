
## Editar nome de exibicao e remover festas individuais da escala

### O que muda

**1. Remover festa individual da escala**
- Adicionar um botao "X" (ou icone de lixeira pequeno) em cada card de festa dentro da escala expandida
- Ao clicar, remove o `event_id` do array `event_ids` da escala no banco
- Se a escala ficar com 0 festas, perguntar se quer excluir a escala inteira
- Atualiza o contador de festas automaticamente

**2. Nome de exibicao customizavel por festa**
- Adicionar uma coluna `event_display_names` (jsonb) na tabela `freelancer_schedules` - um mapa `{ event_id: "nome customizado" }`
- Adicionar uma opcao de toggle/select por festa no card: "Nome do anfitriao" ou "Festa genérica (data/hora)"
- Formato genérico: "Festa 01/03 as 13:00" (sem revelar nome do cliente)
- Formato anfitriao: mostra o titulo original do evento (nome do anfitriao)
- Na pagina publica (`PublicFreelancerSchedule`), usar o `display_name` customizado ao inves do `ev.title`

### Detalhes Tecnicos

**Migration SQL:**
- Adicionar coluna `event_display_names jsonb default '{}'::jsonb` em `freelancer_schedules`

**Arquivos modificados:**

1. **`src/components/freelancer/ScheduleCard.tsx`**
   - Adicionar botao de remover festa (icone X) no header de cada evento
   - Adicionar toggle por festa: um dropdown/botao para alternar entre "Nome do anfitriao" e "Festa DD/MM as HH:MM"
   - Exibir o `display_name` quando configurado, senao mostrar o titulo original

2. **`src/components/freelancer/FreelancerSchedulesTab.tsx`**
   - Nova prop/callback `onRemoveEvent(scheduleId, eventId)` que faz UPDATE no array `event_ids` removendo o ID e tambem limpa availability/assignments relacionados
   - Nova prop/callback `onUpdateDisplayName(scheduleId, eventId, displayName)` que atualiza o jsonb `event_display_names`
   - Passar `event_display_names` para o `ScheduleCard`

3. **`src/pages/PublicFreelancerSchedule.tsx`**
   - Carregar `event_display_names` do schedule
   - Usar o nome customizado (se existir) no lugar de `ev.title` na lista de festas publicas

### Fluxo do usuario

No card de cada festa dentro da escala:
```text
+--------------------------------------------------+
| DOM  Festa 01/03 as 13:00   [Anfitriao v] [X]   |
|  01  01/03 · 13:00 · Castelo                     |
+--------------------------------------------------+
```
- O dropdown `[Anfitriao v]` permite escolher entre:
  - "Nome do anfitriao" (ex: "Jessica Lopes")  
  - "Festa generica" (ex: "Festa 01/03 as 13:00")
- O botao `[X]` remove a festa da escala (com confirmacao)
