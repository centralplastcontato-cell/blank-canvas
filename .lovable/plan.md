

## Validação de Conflito de Horário na Criação de Festas

### Problema
Atualmente, o sistema permite criar duas festas no mesmo dia e horário sem qualquer bloqueio. A detecção de conflitos (`getConflicts`) existe apenas para exibição visual no calendário, mas não impede a criação.

### Solução

Adicionar uma verificação de conflito de horário **dentro do `EventFormDialog`** antes de permitir o salvamento. Quando o usuário preencher data, horários e unidade, o sistema consultará o banco em tempo real e, se houver sobreposição, exibirá um card de alerta bloqueante impedindo o envio do formulário.

### Implementação

#### Arquivo: `src/components/agenda/EventFormDialog.tsx`

**1. Nova função de verificação de conflito**
- Após o usuário preencher `event_date`, `start_time`, `end_time` e `unit`, disparar uma consulta ao Supabase buscando eventos no mesmo dia e unidade com horários sobrepostos
- Usar a mesma lógica de `inferEndTime` (se `end_time` não existir, assumir 3h de duração)
- Excluir o próprio evento em caso de edição, e eventos cancelados
- Armazenar o resultado em um state `conflictEvent` (nome, horário do evento conflitante)

**2. Card de alerta bloqueante**
- Exibir um card vermelho/destrutivo no topo do formulário quando `conflictEvent` estiver preenchido
- Mostrar: icone de alerta, mensagem clara ("Conflito de horário detectado"), detalhes do evento existente (nome, horário)
- Mensagem orientando o usuário a alterar o horário

**3. Bloqueio do botão de salvar**
- Desabilitar os botões "Criar Festa" / "Salvar e continuar" quando houver conflito ativo
- O botão só volta a ficar habilitado quando o usuário alterar data, horário ou unidade e o conflito for resolvido

**4. Trigger da verificação**
- Usar um `useEffect` que dispara quando `event_date`, `start_time`, `end_time` ou `unit` mudam
- Incluir debounce curto (300ms) para evitar consultas excessivas
- Consulta leve: `SELECT id, title, start_time, end_time FROM company_events WHERE company_id = X AND event_date = Y AND unit = Z AND status != 'cancelado'`

### Detalhes Técnicos

```text
Lógica de sobreposição:
  Evento existente: 14:00 – 18:00
  Novo evento:      16:00 – 20:00
  → 16:00 < 18:00 AND 20:00 > 14:00 → CONFLITO

  Novo evento:      18:00 – 22:00
  → 18:00 < 18:00? NÃO → SEM CONFLITO (horários adjacentes permitidos)
```

### Impacto
- Funciona em todos os lugares que usam `EventFormDialog` (Agenda, CentralAtendimento, LeadDetailSheet)
- Não altera a estrutura do banco de dados
- Não bloqueia edições do próprio evento (exclui `event.id` da busca)

