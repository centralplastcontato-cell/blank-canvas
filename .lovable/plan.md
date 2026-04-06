
Objetivo: fazer o atalho de "Atendimento" da Central de Atendimento abrir o mesmo modal completo usado na aba de Visitas, em vez do modal reduzido atual.

Diagnóstico
- Hoje existem 2 fluxos diferentes:
  1. `src/pages/Visitas.tsx` tem um modal completo inline, com:
     - seleção/vínculo de lead
     - vínculo com festa (`event_id`)
     - card-resumo da festa
     - responsável
     - unidade
     - motivo/itens do atendimento
     - observações
  2. `src/components/whatsapp/QuickVisitDialog.tsx` é um modal simplificado, usado pelo atalho da Central/WhatsApp.
- Então o sistema está “correto” na aba Visitas e “reduzido” na Central porque são implementações diferentes.

Plano de implementação
1. Unificar o formulário de agendamento
- Extrair a estrutura completa do modal da aba `Visitas` para um componente reutilizável.
- Esse componente deve suportar 2 contextos:
  - contexto livre: usado em `/visitas`, permitindo buscar/selecionar lead
  - contexto com lead fixo: usado na Central, com o lead já preenchido e bloqueado

2. Fazer o atalho de Atendimento usar o modal completo
- No `WhatsAppChat`, quando `quickVisitType === "atendimento"`, abrir o componente completo em modo “lead fixo”.
- Carregar automaticamente:
  - festas do lead
  - card-resumo da festa selecionada
  - responsável/unidade
  - motivo/itens do atendimento
  - observações
- Manter título, CTA e identidade visual roxa de “Atendimento”.

3. Preservar o atalho rápido de Visita
- Manter a experiência rápida de `visita` comercial como está hoje, a menos que você queira depois unificar os dois.
- Ou seja:
  - `Visita` continua no fluxo rápido
  - `Atendimento` passa a usar o fluxo completo

4. Padronizar submissão dos dados
- Garantir que o modal completo da Central grave os mesmos campos já usados em `/visitas`:
  - `visit_type = "atendimento"`
  - `event_id`
  - `items_description`
  - `responsavel_user_id`
  - `unit`
  - `observacoes`
  - `data_visita` / `horario_visita`

5. Validar comportamento pós-salvamento
- Após salvar:
  - fechar modal
  - atualizar o card/refresh da visita no chat
  - manter consistência com o histórico exibido no lead
- Garantir que o modal não volte a abrir no formato reduzido por estado antigo.

Arquivos impactados
- `src/pages/Visitas.tsx`
- `src/components/whatsapp/WhatsAppChat.tsx`
- `src/components/whatsapp/QuickVisitDialog.tsx` ou substituição por componente compartilhado
- Possível novo componente compartilhado, algo como:
  - `src/components/visitas/VisitFormDialog.tsx`

Detalhes técnicos
- A melhor abordagem é evitar manter 2 modais diferentes para o mesmo tipo de agendamento.
- Como os campos de atendimento já existem no frontend e no payload atual da aba Visitas, isso parece ser ajuste de arquitetura de UI, não de banco.
- No modo “lead fixo” da Central:
  - o bloco do lead aparece preenchido
  - a busca de lead some ou fica bloqueada
  - o restante do formulário permanece igual ao da aba Visitas

Resultado esperado
- Clicar em “Atendimento” na Central de Atendimento abrirá o modal completo, igual ao da aba Visitas.
- O usuário verá todas as informações e campos corretos do atendimento, sem o modal reduzido atual.

QA que vou fazer na implementação
- Testar o atalho “Atendimento” na Central
- Confirmar que o modal abre com todos os blocos esperados
- Verificar vínculo com festa + card-resumo
- Salvar e confirmar persistência correta no `lead_visits`
- Testar também o botão da aba `/visitas` para garantir que nada quebre
- Verificar desktop e mobile, já que `WhatsAppChat` é reutilizado
