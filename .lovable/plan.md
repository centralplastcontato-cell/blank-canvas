
## Corrigir arraste do botao de suporte no mobile

### Problema
O `animate={{ x: 0, y: 0 }}` do Framer Motion reseta a posicao do botao para (0,0) a cada re-render, anulando o arraste. No mobile, isso impede completamente o movimento porque o touch gesture e cancelado pelo reset da animacao.

### Solucao

**Arquivo: `src/components/support/SupportChatbot.tsx`**

1. **Remover `x: 0, y: 0` do `animate`** -- manter apenas `scale` e `opacity`. Isso para de resetar a posicao durante o arraste.

2. **Aumentar `bottomPx` padrao de 24 para 90** -- evita sobreposicao com a barra de input/microfone do WhatsApp no mobile.

3. **Trocar `onTap` por `onClick` com guard de distancia** -- no mobile, `onTap` do Framer Motion pode conflitar com o drag. Usar um handler manual que checa se o dedo se moveu mais de 5px (drag) ou nao (tap/click).

4. **Adicionar `dragConstraints` na window** -- limitar o arraste dentro da tela visivel usando um ref do body ou valores calculados.

### Mudanca principal

```text
Antes (linha 143):
  animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}

Depois:
  animate={{ scale: 1, opacity: 1 }}

Antes (linha 44):
  return { side: "right", bottomPx: 24 };

Depois:
  return { side: "right", bottomPx: 90 };

Antes (linhas 152-154):
  onTap={() => { if (!isDragging.current) onTap(); }}

Depois:
  onClick={() => { if (!isDragging.current) onTap(); }}
```

Apenas o arquivo `SupportChatbot.tsx` sera modificado. Sem dependencias novas.
