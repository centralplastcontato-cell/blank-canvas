

## Problema: Tela "pula" para baixo ao rolar historico do chat

### Causa Raiz

O efeito de "auto-scroll para baixo" (linhas 887-905 do `WhatsAppChat.tsx`) nao distingue entre **mensagens novas que chegam no final** e **mensagens antigas carregadas no topo** (loadMore/scroll infinito).

Quando voce rola para cima e o sistema carrega mensagens mais antigas, `messages.length` aumenta. O efeito detecta isso como "mensagem nova" e chama `forceScrollToBottom()`, jogando a tela para baixo.

Alem disso, se a ultima mensagem visivel foi enviada por voce (`from_me = true`), o scroll para baixo e forcado **independente** de onde voce esta na conversa.

### Solucao

Adicionar uma flag `isLoadingMoreRef` que o efeito de auto-scroll respeita. Quando mensagens antigas estao sendo carregadas (loadMore), o auto-scroll nao deve ser acionado.

### Alteracoes Tecnicas

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**

1. **Efeito de auto-scroll (linhas ~887-905)**: Adicionar verificacao de `isLoadingMoreRef.current` -- se estiver carregando mensagens antigas, ignorar o incremento de `messages.length` e nao rolar para baixo.

2. **Flag `isLoadingMoreRef`**: Ja existe no codigo (linha 231), e ja e setada como `true` em `fetchMessages` quando `loadMore=true`. Basta consulta-la no efeito.

3. **Ajuste adicional**: Manter `isLoadingMoreRef.current = true` ate DEPOIS da restauracao de scroll no `loadMoreMessages` (mover o reset para dentro do `requestAnimationFrame`), evitando que o efeito dispare durante a janela entre o setState e o rAF.

A mudanca e simples e cirurgica -- apenas 2-3 linhas alteradas, sem impacto em outros comportamentos do chat.

