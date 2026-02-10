

## Etapas 3b, 4 e 7 — Toggle do Admin, Permissao Granular e Processador de Fluxo no Webhook

### O que ja esta pronto

- Banco de dados: 5 tabelas criadas + coluna `use_flow_builder` em `wapi_bot_settings` + permissao `flowbuilder.manage`
- Camada 1 (Hub): modulo `flow_builder` em `useCompanyModules.ts` com toggle automatico no `CompanyModulesDialog`
- Componentes do Flow Builder: 10 arquivos importados em `src/components/flowbuilder/`
- Aba "Fluxos" no `WhatsAppConfig.tsx`: visivel somente se `modules.flow_builder === true`

### O que falta implementar

---

### Etapa 3b — Toggle "Usar Flow Builder" na AutomationsSection

**Arquivo:** `src/components/whatsapp/settings/AutomationsSection.tsx`

Adicionar um card na secao de Automacoes com:
- Import de `useCompanyModules` para verificar se o Hub liberou o modulo
- Toggle "Usar Flow Builder" que salva em `wapi_bot_settings.use_flow_builder`
- Visivel somente quando `modules.flow_builder === true`
- Quando ativado: exibir um aviso que o bot fixo sera substituido pelo fluxo visual
- Adicionar `use_flow_builder` na interface `BotSettings` do componente
- Adicionar ao `fetchBotSettings` e `updateBotSettings`

O toggle fica dentro do card "Bot de Qualificacao", logo apos o toggle de "Bot Global", com o visual:

```text
+--------------------------------------------------+
| [icon] Flow Builder                    [Switch]   |
| Substituir bot fixo pelo fluxo visual             |
| Aviso: "O fluxo padrao sera usado no lugar..."    |
+--------------------------------------------------+
```

---

### Etapa 4 — Verificacao de permissao `flowbuilder.manage`

**Arquivos:** `src/components/flowbuilder/FlowListManager.tsx`, `src/hooks/usePermissions.ts`

- No `FlowListManager`, verificar se o usuario tem permissao `flowbuilder.manage` via hook existente
- Se nao tiver: ocultar botoes de criar, editar e excluir fluxos (modo somente leitura)
- Admin e owner sempre tem acesso total (usar `isCompanyAdmin()` do CompanyContext)

---

### Etapa 7 — Processador de Fluxo no wapi-webhook

**Arquivo:** `supabase/functions/wapi-webhook/index.ts`

Adicionar uma funcao `processFlowBuilderMessage` que sera chamada no lugar de `processBotQualification` quando `use_flow_builder === true`.

**Logica do processador:**

1. No inicio de `processBotQualification`, verificar `settings.use_flow_builder`
2. Se `true`: chamar `processFlowBuilderMessage()` e retornar
3. Se `false`: continuar com o fluxo fixo atual (sem mudancas)

**Funcao `processFlowBuilderMessage`:**

1. Buscar o fluxo ativo/padrao da empresa (`conversation_flows` com `is_default = true` e `is_active = true`)
2. Buscar o estado do lead (`flow_lead_state` por `conversation_id`)
3. Se nao tem estado: criar estado no no inicial (start), enviar primeira mensagem
4. Se tem estado e `waiting_for_reply = true`: processar resposta do lead
5. Encontrar a aresta correspondente (por opcao escolhida ou fallback)
6. Mover para o proximo no e executar a acao:
   - `message`: enviar mensagem de texto
   - `question`: enviar pergunta com opcoes numeradas
   - `action`: executar acao (handoff, extract_data, send_media, schedule_visit)
   - `end`: desabilitar bot, enviar mensagem final
7. Salvar estado atualizado em `flow_lead_state`
8. Criar/atualizar lead no CRM com dados extraidos

**Acoes suportadas:**
- `handoff`: desabilita bot, cria notificacao para equipe
- `extract_data`: salva campo extraido (nome, mes, dia, convidados) no `collected_data` e no CRM
- `send_media`: envia fotos/videos/PDFs dos materiais de venda (reutiliza funcoes existentes)
- `schedule_visit`: marca `has_scheduled_visit` na conversa e atualiza status do lead

**Integracao com o webhook existente (linha ~1583):**
```text
if (!fromMe && !isGrp && type === 'text' && content) {
  // Buscar settings da instancia
  // Se use_flow_builder: processFlowBuilderMessage(...)
  // Senao: processBotQualification(...) (atual)
}
```

---

### Detalhes tecnicos

**Mudancas na AutomationsSection:**
- Adicionar `use_flow_builder: boolean` na interface `BotSettings`
- Importar `useCompanyModules`
- Novo card condicional (`modules.flow_builder && ...`)
- Toggle salva via `updateBotSettings({ use_flow_builder: checked })`

**Mudancas no FlowListManager:**
- Importar `usePermissions` ou usar `useCompany().isCompanyAdmin()`
- Verificar `flowbuilder.manage` antes de renderizar botoes de edicao
- Manter listagem/visualizacao para todos

**Mudancas no wapi-webhook:**
- Nova funcao `processFlowBuilderMessage()` (~200 linhas)
- Reutiliza funcoes existentes: `sendBotMessage`, `sendImage`, `sendVideo`, `sendDocument`
- Leitura de `flow_nodes`, `flow_edges`, `flow_node_options`
- CRUD de `flow_lead_state`
- Integracao com `campaign_leads` para extrair dados

**Arquivos modificados:**
- `src/components/whatsapp/settings/AutomationsSection.tsx`
- `src/components/flowbuilder/FlowListManager.tsx`
- `supabase/functions/wapi-webhook/index.ts`

