

## Disparo de Escala para Grupos de WhatsApp

### Restricao de seguranca

**Nenhum codigo de conexao, QR code, webhook, status de instancia ou alteracao na tabela `wapi_instances` sera tocado.** O componente apenas:
- **Le** instancias conectadas (`SELECT ... WHERE status = 'connected'`)
- **Le** conversas de grupo (`SELECT ... WHERE remote_jid LIKE '%@g.us'`)
- **Chama** `supabase.functions.invoke("wapi-send", { body: { action: "send-text", ... } })` — mesmo padrao do `ShareToGroupDialog` e `SendBotDialog` ja em producao

### Arquivos

| Acao | Arquivo |
|---|---|
| Criar | `src/components/freelancer/SendScheduleToGroupsDialog.tsx` |
| Criar | `src/components/whatsapp/settings/ScheduleGroupMessageCard.tsx` |
| Editar | `src/components/freelancer/ScheduleCard.tsx` (novo botao no header) |
| Editar | `src/components/freelancer/FreelancerSchedulesTab.tsx` (estado + dialog) |
| Editar | `src/components/whatsapp/settings/AutomationsSection.tsx` (importar card na aba Gatilhos) |

### 1. Card de template nas Configuracoes (`ScheduleGroupMessageCard`)

Mesmo padrao do `FreelancerApprovalMessageCard`:
- Textarea com template editavel
- Salva em `companies.settings.freelancer_schedule_group_message`
- Botoes "Salvar" e "Restaurar padrao"
- Mostra badges com variaveis: `{link}`, `{titulo}`, `{periodo}`, `{qtd_festas}`, `{observacoes}`
- Template padrao:

```
📋 *{titulo}*

🗓️ Periodo: {periodo}
🎉 {qtd_festas} festa(s) disponiveis

Informe sua disponibilidade pelo link abaixo:
👉 {link}

{observacoes}
```

Sera adicionado na aba **Gatilhos** logo abaixo do `FreelancerApprovalMessageCard`.

### 2. Dialogo de envio para grupos (`SendScheduleToGroupsDialog`)

Baseado nos padroes do `ShareToGroupDialog` (UI) + `SendBotDialog` (envio em lote com delay):

- **Props**: `open`, `onOpenChange`, `schedule` (titulo, datas, event_ids, slug, notes), `companyId`, `companySlug`, `customDomain`
- Ao abrir:
  - Le `wapi_instances` da empresa com `status = 'connected'` (somente leitura)
  - Le `wapi_conversations` com `remote_jid LIKE '%@g.us'` (somente leitura)
  - Le template de `companies.settings.freelancer_schedule_group_message`
- Campo de busca para filtrar grupos
- **Checkboxes** para selecao multipla de grupos
- Textarea com mensagem pre-preenchida (variaveis substituidas)
- Envio sequencial com delay aleatorio 1-3s (padrao `SendBotDialog`)
- Barra de progresso durante o envio

### 3. Botao no `ScheduleCard`

Novo botao com icone `Send` no header, ao lado do Copy/PDF/Delete. Nova prop `onSendToGroups`.

### 4. Integracao no `FreelancerSchedulesTab`

- Estado `sendToGroupsSchedule` para rastrear qual escala esta sendo compartilhada
- Passa `onSendToGroups` para cada `ScheduleCard`
- Renderiza `SendScheduleToGroupsDialog` no final do componente

### Nenhuma alteracao de banco de dados necessaria

Tudo utiliza tabelas e edge functions ja existentes. Nenhum codigo de conexao, instancia ou webhook sera modificado.

