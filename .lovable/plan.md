

## Diagnóstico: Overflow horizontal na lista de conversas (todas as unidades/clientes)

### O que encontrei

Olhando o screenshot com atenção, **TODAS** as conversas estão com o lado direito cortado (timestamps "18:", "17:", "15:" e badges parcialmente visíveis), **inclusive** conversas sem lead vinculado (como "Mylena" sem ícone de link). O problema **não é** o `ConversationStatusActions` — é um overflow horizontal no container da lista.

### Causa provável

O componente `ScrollArea` do Radix UI internamente ajusta a largura do viewport quando há barra de rolagem vertical ativa. Quando há muitas conversas (como na Manchester ou nesse outro cliente), a barra de rolagem aparece e o viewport fica ligeiramente menor que o container. Os itens com `shrink-0` no lado direito (timestamp) não encolhem, causando o corte de ~15-20px na borda direita.

Na Trujillo, pode haver menos conversas (sem necessidade de scroll) ou simplesmente o conteúdo caber dentro da largura reduzida.

### Correção

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx`

**1. Adicionar `overflow-hidden` no botão de cada conversa (linha 3326):**
```tsx
// De:
"w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-primary/5 ..."
// Para:
"w-full px-3 py-2.5 flex items-center gap-2.5 overflow-hidden hover:bg-primary/5 ..."
```

**2. Garantir constraints de largura no container de conteúdo (linha 3358):**
```tsx
// De:
"flex-1 min-w-0 overflow-hidden"
// Para:
"flex-1 min-w-0 overflow-hidden max-w-full"
```

**3. Adicionar `overflow-hidden` ao ScrollArea mobile (linha 3312):**
```tsx
// De:
<ScrollArea className="flex-1">
// Para:
<ScrollArea className="flex-1 w-full">
```

Essas mudanças garantem que nenhum filho do botão de conversa extrapole o viewport, independentemente do estado da barra de rolagem do ScrollArea.

