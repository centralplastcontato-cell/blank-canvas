

## Bug Crítico: Chat troca de conversa sozinho

### Problema Identificado

Enquanto o usuário está conversando com o Lead A, a tela troca automaticamente para o Lead B sem nenhuma ação do usuário. Isso causou envio de mensagens e até convites para leads errados.

### Causa Raiz (3 problemas encontrados)

**1. Re-execução desnecessária do realtime** (`WhatsAppChat.tsx` linha 1164)
O `useEffect` que gerencia o canal realtime e carrega conversas tem `selectedConversation?.id` na lista de dependências. Isso significa que toda vez que o usuário clica em uma conversa, o efeito inteiro re-executa — recriando o canal realtime E chamando `fetchConversations()` de novo. Essa re-execução pode causar race conditions onde a lista de conversas é recarregada enquanto o usuário está interagindo.

**2. Refresh completo via debounce** (linhas 1151-1154)
A cada evento realtime (qualquer mensagem em qualquer conversa), um timer de 5 segundos agenda um `fetchConversations()` completo. Esse refresh substitui toda a lista de conversas e pode causar re-renders que afetam a seleção.

**3. Pattern de `initialPhone`** (`CentralAtendimento.tsx` linha 118)
O código faz `setInitialPhone(null)` seguido de `setInitialPhone(phoneParam)` na mesma execução, o que pode disparar efeitos duplicados no WhatsAppChat.

### Plano de Correção

#### Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`

**Passo 1 — Separar o useEffect de realtime da seleção de conversa**
- Remover `selectedConversation?.id` da lista de dependências do useEffect de realtime (linha 1164)
- Usar um `ref` para acessar o ID da conversa selecionada dentro do callback do realtime, em vez do state direto
- Isso impede que trocar de conversa recrie o canal e recarregue tudo

**Passo 2 — Eliminar o refresh completo no debounce**
- Remover o `fetchConversations()` do debounce de 5 segundos (linhas 1151-1154)
- As atualizações inline já acontecem no handler de realtime (linhas 1085-1123) — o refresh completo é redundante e perigoso
- Se necessário manter como safety net, aumentar para 30+ segundos e garantir que não afete a seleção

**Passo 3 — Proteger a seleção contra re-renders**
- Adicionar um `selectedConversationRef` que mantém o ID da conversa ativa
- No `fetchConversations`, se já existe uma conversa selecionada e não há `selectPhone`, preservar a seleção atual sem alterá-la
- Garantir que nenhum path de código altere `selectedConversation` sem ação explícita do usuário

**Passo 4 — Corrigir o pattern de initialPhone**
- No `CentralAtendimento.tsx`, remover o `setInitialPhone(null)` redundante antes do `setInitialPhone(phoneParam)` (linha 118)
- Usar uma key ou timestamp para forçar re-processamento em vez de null→value

### Detalhes Técnicos

```text
ANTES (bugado):
useEffect(() => {
  fetchConversations();        // ← re-executa quando conversa muda
  channel.on('*', () => {
    // update inline...
    debounce(() => fetchConversations(), 5000);  // ← refresh completo
  });
}, [selectedInstance, selectedConversation?.id]);  // ← BUG AQUI

DEPOIS (corrigido):
const selectedConvRef = useRef(selectedConversation?.id);
selectedConvRef.current = selectedConversation?.id;

useEffect(() => {
  fetchConversations();
  channel.on('*', (payload) => {
    // update inline apenas — sem refresh completo
    // usar selectedConvRef.current para notificações
  });
}, [selectedInstance]);  // ← só reconecta quando muda de instância
```

### Impacto
- Zero impacto em funcionalidades existentes
- Menos chamadas ao banco de dados (remove refreshes desnecessários)
- Usuário nunca mais terá a conversa trocada automaticamente

