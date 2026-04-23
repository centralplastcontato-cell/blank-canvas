

## Correção: Mensagem fantasma ao trocar de conversa rapidamente

### Problema identificado

Quando o usuário envia uma mensagem para o contato X e rapidamente abre a conversa do contato Y, a mensagem enviada para X aparece dentro do chat de Y.

**Causa raiz:** O callback `handleNewRealtimeMessage` (linha 1345) **não valida** se a mensagem pertence à conversa atualmente selecionada. Ele simplesmente faz `setMessages(prev => [...prev, newMessage])` sem checar `newMessage.conversation_id`.

**Cenário da race condition:**
1. Usuário envia mensagem para conversa X → mensagem otimista adicionada.
2. Usuário troca para conversa Y → `setMessages([])` limpa o estado e carrega mensagens de Y.
3. O webhook do WhatsApp entrega a mensagem real de X via realtime. O canal antigo (filtrado por conv X) pode ainda estar ativo por milissegundos antes do cleanup do React executar.
4. `handleNewRealtimeMessage` é chamado com a mensagem de X, mas adiciona ao estado atual (que agora contém mensagens de Y).

O mesmo problema pode ocorrer com o **polling fallback** — embora o `conversationId` no closure seja atualizado, o `onNewMessageRef` aponta para o handler que não verifica o conversation_id.

### Solução

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx`

**1. Criar um ref para o conversation_id ativo (junto às outras refs)**
- Adicionar `const activeConversationIdRef = useRef<string | null>(null);`
- Atualizar esse ref sempre que `selectedConversation` mudar.

**2. Validar conversation_id em `handleNewRealtimeMessage` (linha 1345)**
- No início do callback, verificar: se `newMessage.conversation_id !== activeConversationIdRef.current`, ignorar a mensagem (return prev sem alteração).

**3. Validar conversation_id em `handleRealtimeMessageUpdate` (linha 1383)**
- Mesma verificação: ignorar updates de conversas que não são a ativa.

**4. Proteger a resposta do envio (linhas 2399, 2414, 2419)**
- Nos `setMessages` pós-envio (sucesso e erro), verificar se ainda estamos na mesma conversa antes de atualizar o estado. Se não, ignorar silenciosamente (a mensagem já será visível quando o usuário voltar à conversa X).

### Resultado esperado

Mensagens de uma conversa nunca aparecerão na outra, mesmo trocando rapidamente. A validação por `conversation_id` garante isolamento total.

