

## Adicionar variavel `{{empresa}}` nos templates de mensagem

### Problema
Os templates de resposta rapida na Central de Atendimento contem o nome "Castelo da Diversao" escrito diretamente no texto (hardcoded). Isso faz com que, quando outro buffet usar a plataforma, as mensagens ainda mencionem o nome errado.

### Solucao
Adicionar suporte a variavel `{{empresa}}` (e alias `{{buffet}}`) nos templates, permitindo que qualquer buffet use templates genericos que se adaptam automaticamente ao nome da empresa logada.

### O que sera feito

1. **Frontend - Substituicao de variaveis ao aplicar template** (`src/components/whatsapp/WhatsAppChat.tsx`)
   - Na funcao `applyTemplate`, adicionar a substituicao de `{{empresa}}` e `{{buffet}}` pelo nome da empresa atual (ja disponivel via `useCompany()` ou contexto existente)

2. **Frontend - Lista de variaveis disponiveis** (`src/components/whatsapp/settings/MessagesSection.tsx`)
   - Adicionar `{{empresa}}` na grade de "Variaveis Disponiveis" para que os usuarios saibam que podem usar essa variavel

3. **Dados existentes - Nao sera alterado automaticamente**
   - Os templates ja salvos no banco com "Castelo da Diversao" hardcoded precisam ser editados manualmente pelo administrador de cada empresa, trocando o texto fixo por `{{empresa}}`
   - Isso e intencional: nao queremos alterar mensagens que o usuario ja personalizou

### Detalhes tecnicos

**Arquivo 1**: `src/components/whatsapp/WhatsAppChat.tsx` (funcao `applyTemplate`, ~linha 2150)
- Adicionar `.replace(/\{\{?empresa\}?\}/gi, companyName)` e `.replace(/\{\{?buffet\}?\}/gi, companyName)`
- O `companyName` vem do contexto da empresa atual (hook `useCompany` ja usado no componente ou propagado via props)

**Arquivo 2**: `src/components/whatsapp/settings/MessagesSection.tsx` (secao "Variaveis Disponiveis", ~linha 239)
- Adicionar `{{empresa}}` na grid de variaveis exibidas

**Backend**: O `wapi-webhook` e o `follow-up-check` ja suportam `{{empresa}}` e `{{buffet}}` no `replaceVars` -- nenhuma alteracao necessaria no backend.

