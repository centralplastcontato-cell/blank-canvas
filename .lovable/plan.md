

## Integrar Flow Builder com Sistema de Permissoes em Camadas

### Resumo

Adicionar o Flow Builder ao projeto com um modelo de permissoes em duas camadas:
1. **Hub (Master)** libera o modulo "Flow Builder" para cada empresa-filha
2. **Admin da empresa** decide se ativa o Flow Builder e controla quem pode editar fluxos

Isso segue exatamente o padrao ja existente no projeto (ex: modulos WhatsApp, CRM, Dashboard que o Hub libera por empresa).

---

### Como funciona o modelo de permissoes

```text
+---------------------------+
|     HUB (Master)          |
|  CompanyModulesDialog     |
|  Toggle: "Flow Builder"  |-----> Libera/bloqueia para empresa X
+---------------------------+
            |
            v
+---------------------------+
|   Admin da Empresa        |
|  AutomationsSection       |
|  Toggle: "Usar Flow       |-----> Ativa/desativa na empresa
|          Builder"         |
+---------------------------+
            |
            v
+---------------------------+
|   Funcionarios            |
|  Permissao granular:      |
|  "flowbuilder.manage"     |-----> Quem pode criar/editar fluxos
+---------------------------+
```

---

### Etapas de implementacao

**Etapa 1 — Banco de dados (migracao SQL)**

- Criar 5 tabelas: `conversation_flows`, `flow_nodes`, `flow_node_options`, `flow_edges`, `flow_lead_state`
- Todas com `company_id` e RLS filtrando por empresa
- Adicionar coluna `use_flow_builder BOOLEAN DEFAULT false` na tabela `wapi_bot_settings`
- RLS policies permitindo acesso apenas a membros da empresa

**Etapa 2 — Camada 1: Hub libera o modulo**

- Adicionar `flow_builder: boolean` ao `CompanyModules` em `useCompanyModules.ts`
- Adicionar label no `MODULE_LABELS`: "Flow Builder" / "Editor visual de fluxos de conversa"
- O `CompanyModulesDialog` ja vai exibir o toggle automaticamente (usa `moduleKeys` dinamico)
- Valor padrao: `false` (desativado ate o Hub liberar)

**Etapa 3 — Camada 2: Admin da empresa ativa o Flow Builder**

- Na `AutomationsSection`, verificar se o modulo `flow_builder` esta liberado pelo Hub via `useCompanyModules()`
- Se liberado: exibir toggle "Usar Flow Builder" que salva em `wapi_bot_settings.use_flow_builder`
- Se nao liberado: nao exibir a opcao (ou exibir desabilitada com tooltip "Funcionalidade nao liberada")
- Quando ativado: exibir link/botao para acessar o editor de fluxos

**Etapa 4 — Camada 3: Permissao granular para funcionarios**

- Adicionar permissao `flowbuilder.manage` na tabela `permission_definitions`
- Funcionarios sem essa permissao veem o fluxo ativo mas nao podem editar
- Admin e gestor da empresa podem conceder essa permissao via `PermissionsPanel`

**Etapa 5 — Importar componentes do Flow Builder**

- Copiar os 10 arquivos para `src/components/flowbuilder/`
- Adaptar imports para o projeto (supabase client, shadcn, company_id no lugar de business_id)
- Filtrar fluxos por `company_id` da empresa ativa
- Verificar permissao `flowbuilder.manage` antes de permitir edicao

**Etapa 6 — Integrar na interface de Configuracoes**

- Adicionar secao "Fluxos de Conversa" no `WhatsAppConfig.tsx`
- Visivel somente se `modules.flow_builder === true`
- Dentro da secao: `FlowListManager` para gerenciar fluxos
- Botoes de edicao condicionados a permissao `flowbuilder.manage`

**Etapa 7 — Atualizar webhook (wapi-webhook)**

- No processamento de mensagens, verificar `use_flow_builder` no `wapi_bot_settings`
- Se ativo: carregar fluxo ativo da empresa, processar mensagem pelos nos/arestas
- Se inativo: manter o bot fixo atual sem alteracoes
- O processador de fluxo sera integrado diretamente no `index.ts` da edge function

---

### Detalhes tecnicos

**Novo modulo em `useCompanyModules.ts`:**
- Adicionar `flow_builder: boolean` ao `CompanyModules`
- Default `false` no `DEFAULT_MODULES`
- Parse com `modules.flow_builder === true` (opt-in, nao opt-out)

**Nova permissao granular:**
- Codigo: `flowbuilder.manage`
- Categoria: `Automacoes`
- Descricao: "Criar e editar fluxos de conversa no Flow Builder"

**Logica de visibilidade:**
- Hub nao liberou o modulo -> secao invisivel na empresa
- Hub liberou, admin nao ativou -> toggle visivel mas desligado, editor oculto
- Hub liberou, admin ativou -> editor visivel, webhook usa o fluxo
- Funcionario sem permissao -> pode ver fluxo ativo mas nao editar

**Arquivos novos:**
```text
src/components/flowbuilder/
  types.ts
  FlowBuilder.tsx
  FlowCanvas.tsx
  FlowNodeComponent.tsx
  FlowEdgeComponent.tsx
  FlowNodeEditor.tsx
  FlowToolbar.tsx
  FlowPreviewDialog.tsx
  FlowListManager.tsx
  useFlowBuilder.ts
```

**Arquivos modificados:**
- `src/hooks/useCompanyModules.ts` — adicionar `flow_builder`
- `src/components/hub/CompanyModulesDialog.tsx` — automatico (ja usa moduleKeys)
- `src/components/whatsapp/settings/AutomationsSection.tsx` — toggle + secao
- `src/components/whatsapp/WhatsAppConfig.tsx` — nova secao condicional
- `supabase/functions/wapi-webhook/index.ts` — logica do processador de fluxo
- Migracao SQL — 5 tabelas + coluna em bot_settings + permissao

