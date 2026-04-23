
## Correção: vazamento de mensagens entre conversas ainda persiste

### O que está acontecendo de verdade

O problema principal agora não é mais o realtime puro. A proteção adicionada em `handleNewRealtimeMessage` e `handleRealtimeMessageUpdate` ajuda, mas o vazamento continua por causa de **contaminação de estado local** em `src/components/whatsapp/WhatsAppChat.tsx`.

### Causa raiz identificada

Há 3 pontos combinados:

1. **`prevConversationIdRef` está sendo reutilizado para duas responsabilidades**
   - Ele é atualizado no efeito de rascunho (`1148-1174`) antes do efeito de carregamento (`1417-1468`).
   - Resultado: na troca de conversa, a condição `prevConversationIdRef.current !== selectedConversation.id` quase nunca detecta a troca.
   - Consequência: o chat anterior não é limpo de forma confiável.

2. **`fetchMessages()` mistura mensagens antigas com a nova conversa**
   - No carregamento inicial (`2078-2087`), ele faz merge com `prev`.
   - Esse merge foi pensado para preservar mensagens realtime durante o fetch, mas como `prev` ainda pode conter mensagens da conversa anterior, elas entram no chat novo.
   - Como o filtro usa apenas `id` e não `conversation_id`, mensagens de outra conversa sobrevivem no array.

3. **Outros envios assíncronos ainda atualizam o chat sem validar a conversa ativa**
   - A correção anterior protegeu o envio de texto.
   - Mas ainda existem fluxos como **contato, áudio, imagem, vídeo, documento** que fazem `setMessages(...)` depois de `await` sem checar se o usuário continua na mesma conversa.
   - Isso permite que mensagens/status “vazem” quando o usuário troca rápido de chat.

### Por que a correção anterior não resolveu totalmente

Porque ela atacou apenas a entrada via realtime e parte do envio de texto.  
O bug restante vem principalmente do **carregamento assíncrono da conversa** e de **outros handlers de envio** que continuam escrevendo no mesmo estado visual depois que o usuário já mudou de contato.

---

## Plano de correção

### Etapa 1 — separar refs de responsabilidade
No `WhatsAppChat.tsx`:

- Manter um ref exclusivo para rascunho/anterior, por exemplo `draftConversationRef`.
- Criar outro ref exclusivo para controle de conversa ativa/render atual, por exemplo `activeConversationIdRef`.
- Parar de usar `prevConversationIdRef` ao mesmo tempo para:
  - salvar draft
  - detectar troca de conversa
  - controlar limpeza do chat

### Etapa 2 — limpar o chat corretamente ao trocar de conversa
No efeito de mudança de conversa (`1417+`):

- Detectar a troca usando o ref correto.
- Limpar imediatamente:
  - `messages`
  - `linkedLead`
  - `replyingTo`
  - flags de loading/paginação
- Só depois iniciar o carregamento da nova conversa.

Isso evita que o estado visual da conversa anterior permaneça vivo.

### Etapa 3 — blindar `fetchMessages()` contra resposta atrasada
Em `fetchMessages(conversationId, loadMore)`:

- Capturar o `conversationId` da requisição.
- Antes de qualquer `setMessages`, validar:
  - se essa resposta ainda pertence à conversa ativa.
- Se o usuário já trocou de conversa, descartar silenciosamente o resultado.

Além disso:

- No carregamento inicial, não permitir merge com mensagens de outra conversa.
- Filtrar sempre por `message.conversation_id === conversationId`.
- O merge de preservação deve aceitar apenas:
  - mensagens otimistas da mesma conversa
  - mensagens realtime da mesma conversa

### Etapa 4 — proteger todos os envios assíncronos
Aplicar o mesmo padrão de validação aos outros fluxos de envio que ainda estão sem guarda:

- envio de contato
- envio de áudio gravado
- envio de imagem
- envio de vídeo
- envio de documento
- qualquer outro `setMessages(...)` executado após `await`

Regra:
- se `activeConversationIdRef.current !== convId`, não atualizar o array visual atual.

### Etapa 5 — revisar branches de “sem mensagens” e paginação
Também proteger:

- branch de `setMessages([])` quando a query volta vazia
- `loadMore`
- atualizações de cursor/paginação

Para evitar que uma resposta atrasada de uma conversa antiga apague ou misture a conversa nova.

---

## Arquivo que será alterado

- `src/components/whatsapp/WhatsAppChat.tsx`

---

## Resultado esperado

Depois dessa correção:

- mensagens do Victor não aparecerão na Bianca
- mensagens da Bianca não aparecerão no Victor
- trocar rapidamente entre contatos não contaminará o chat atual
- respostas atrasadas de fetch/realtime/envio serão ignoradas se pertencerem à conversa anterior

---

## Resumo técnico

O problema restante é um **race condition de estado no frontend**, não do WhatsApp em si.  
A conversa ativa muda, mas callbacks e fetches antigos ainda escrevem no mesmo `messages`.  
A correção definitiva é isolar rigorosamente o estado por `conversation_id` em:
- troca de conversa
- carregamento inicial
- paginação
- realtime
- pós-envio
