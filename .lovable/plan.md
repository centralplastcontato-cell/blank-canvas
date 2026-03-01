

## Enviar Lista de Escalados para Grupos

### Contexto
Hoje o buffet envia a escala para grupos pedindo disponibilidade. Depois de escalar os freelancers, nao tem como avisar nos mesmos grupos quem foi escalado. O freelancer precisa acessar o sistema para descobrir.

### Solucao
Adicionar um **segundo botao de envio** no `ScheduleCard` (ao lado do botao de enviar escala existente) que monta automaticamente uma mensagem com a **lista dos freelancers escalados por festa** e envia para os grupos usando o mesmo fluxo do `SendScheduleToGroupsDialog`.

### Mensagem gerada automaticamente

Exemplo do formato:

```text
✅ *Escala Definida — Semana 1 março*

📅 01/03 (Domingo) — Festa genérica
  • Victor — Monitor
  • Ana — Garçom

📅 07/03 (Sábado) — Festa genérica
  • Victor — Sem função

🗓️ Período: 01/03 a 07/03
```

### O que sera feito

**1. Novo template configuravel em Configuracoes**
- Criar `freelancer_assignment_group_message` em `companies.settings` (ao lado do template de escala ja existente)
- Criar card `AssignmentGroupMessageCard` similar ao `ScheduleGroupMessageCard`
- Variaveis: `{titulo}`, `{periodo}`, `{lista_escalados}`, `{observacoes}`
- A variavel `{lista_escalados}` sera montada automaticamente a partir dos assignments

**2. Novo dialog `SendAssignmentsToGroupsDialog`**
- Reaproveitara a mesma logica de selecao de grupos e envio do `SendScheduleToGroupsDialog`
- A diferenca: a mensagem vem pre-preenchida com os escalados (ao inves do link de disponibilidade)
- Suporte a minimizar, lista com status em tempo real, intervalo de seguranca — tudo ja existente

**3. Novo botao no `ScheduleCard`**
- Icone diferenciado (ex: `UserCheck` ou `ClipboardCheck`) ao lado do botao de enviar escala
- So aparece quando ha pelo menos 1 assignment na escala
- Ao clicar, abre o `SendAssignmentsToGroupsDialog`

**4. Integracao no `FreelancerSchedulesTab`**
- Novo estado `sendAssignmentsSchedule` similar ao `sendToGroupsSchedule`
- Passa os `assignments` e `events` para o novo dialog montar a mensagem

### Arquivos envolvidos

| Arquivo | Acao |
|---------|------|
| `src/components/freelancer/SendAssignmentsToGroupsDialog.tsx` | Criar (baseado no SendScheduleToGroupsDialog) |
| `src/components/whatsapp/settings/AssignmentGroupMessageCard.tsx` | Criar (template da mensagem) |
| `src/components/whatsapp/settings/AutomationsSection.tsx` | Adicionar o novo card |
| `src/components/freelancer/ScheduleCard.tsx` | Adicionar botao de enviar escalados |
| `src/components/freelancer/FreelancerSchedulesTab.tsx` | Gerenciar estado do novo dialog |

### Fluxo do usuario

1. Buffet escala os freelancers nas festas (como ja faz hoje)
2. Clica no novo botao "Enviar escalados" no card da escala
3. Dialog abre com a mensagem pre-montada listando quem foi escalado em cada festa
4. Seleciona os grupos e envia (mesmo fluxo de antes, com minimizar e status em tempo real)
5. Freelancers recebem a mensagem nos grupos e sabem onde foram escalados

