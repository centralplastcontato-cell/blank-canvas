
## Resetar fluxo do chatbot da LP ao reabrir

### Problema
Quando um lead finaliza o fluxo do chatbot na Landing Page e fecha o modal, ao reabrir o chat ele continua mostrando a conversa anterior (ultima mensagem, dados preenchidos). O lead precisa clicar manualmente em "Iniciar nova conversa" para recomecar.

### Solucao
Chamar automaticamente o `resetChat()` quando o modal for fechado (`isOpen` mudar de `true` para `false`). Assim, ao reabrir, `messages.length === 0` e o fluxo de boas-vindas inicia normalmente.

### Mudanca tecnica

**Arquivo: `src/components/landing/LeadChatbot.tsx`**

Adicionar um `useEffect` que detecta quando `isOpen` muda para `false` e reseta todo o estado:

```typescript
useEffect(() => {
  if (!isOpen) {
    resetChat();
  }
}, [isOpen]);
```

Isso deve ser adicionado logo apos a funcao `resetChat` (apos linha 504), garantindo que:
- `messages` volta a `[]`
- `currentStep` volta a `0`
- `leadData` volta a `{}`
- `isComplete` volta a `false`
- `inputType` volta a `null`
- `redirectAccepted` volta a `null`

### Resultado
- Lead fecha o chat (X ou clicando fora) -> estado e zerado
- Lead reabre o chat -> ve a mensagem de boas-vindas novamente
- Nenhuma regressao no fluxo normal (o reset ja existe e funciona)
- O botao "Iniciar nova conversa" continua funcionando para reset sem fechar
