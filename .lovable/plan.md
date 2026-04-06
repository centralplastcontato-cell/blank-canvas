

## Diagnose: "Vulto" de Vendas 1 ao atualizar a tela em Vendas 3

### Causa raiz

Quando a pagina e atualizada (F5), o estado `selectedChatUnit` comeca como `null`. O fluxo e:

```text
1. Refresh → selectedChatUnit = null
2. fetchInstances() carrega instancias ordenadas por nome → [Vendas 1, Vendas 2, Vendas 3]
3. selectedInstance = data[0] → Vendas 1 (primeiro alfabeticamente)
4. Effect em selectedInstance dispara → fetchConversations() de Vendas 1
5. Conversas de Vendas 1 aparecem na lista
6. onInstancesLoaded → selectedChatUnit = "Vendas 1"
7. Se usuario seleciona Vendas 3, effect de externalSelectedUnit troca selectedInstance
8. Novas conversas de Vendas 3 carregam e substituem
```

O problema: **nao ha persistencia da unidade selecionada**. Sempre volta para a primeira instancia, mostrando contatos errados por um instante. O session replay confirma inclusive um flash de "Nenhuma instancia disponivel" antes do carregamento.

### Plano de correcao

**Arquivo 1: `src/pages/CentralAtendimento.tsx`**

1. Persistir `selectedChatUnit` em `localStorage` com chave `chat_selected_unit_{companyId}`.
2. No `useState` inicial, ler do localStorage ao inves de `null`.
3. No `onInstancesLoaded`, respeitar o valor persistido se a instancia ainda existe — nao sobrescrever com `instances[0].unit`.
4. No `setSelectedChatUnit`, salvar no localStorage a cada troca.

**Arquivo 2: `src/components/whatsapp/WhatsAppChat.tsx`**

5. No `fetchInstances` (linha 1527), quando `externalSelectedUnit` esta definido, preferir a instancia correspondente ao inves de `data[0]`.
6. Adicionar um ref para `externalSelectedUnit` e usa-lo na logica de selecao inicial de instancia, evitando que Vendas 1 seja selecionado antes do sync do effect externo.
7. No effect de `selectedInstance` (linha 1054), manter o `setConversations([])` que ja existe para limpar dados da instancia anterior.

### Detalhes tecnicos

- `localStorage` key: `chat_selected_unit_${currentCompany?.id}` para isolamento multi-tenant.
- Na leitura do localStorage, validar que a unidade salva ainda existe nas `chatUnitOptions` antes de usa-la.
- O ref de `externalSelectedUnit` garante que `fetchInstances` ja sabe qual instancia preferir no momento da resolucao, sem depender de re-render.
- Nenhuma alteracao em conexoes WhatsApp, webhooks ou Edge Functions.

### Resultado esperado

Ao atualizar a pagina estando em Vendas 3, o sistema carrega diretamente as conversas de Vendas 3, sem flash de Vendas 1.

