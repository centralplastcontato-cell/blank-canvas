
## Botao de Suporte com posicao ajustavel (drag)

### Problema
O botao flutuante de suporte fica fixo no canto inferior direito (`bottom-6 right-6`) e pode sobrepor elementos importantes da interface, como o campo de digitacao do WhatsApp no mobile.

### Solucao
Tornar o botao arrastavel (draggable) usando Framer Motion `drag`, com persistencia da posicao no `localStorage`. O usuario arrasta o botao para onde preferir e ele "gruda" na borda mais proxima (snap to edge). A posicao e salva e restaurada ao recarregar.

### Detalhes tecnicos

**Arquivo: `src/components/support/SupportChatbot.tsx`**

1. **Drag com Framer Motion**: Usar `drag` no `motion.button` do botao flutuante (ja usa `motion.button`). Framer Motion suporta `drag`, `dragConstraints`, `onDragEnd` nativamente -- sem dependencias novas.

2. **Persistencia no localStorage**: Salvar `{ x, y }` em `localStorage` key `support-btn-pos` ao soltar o botao (`onDragEnd`). Ao montar, ler a posicao salva e aplicar como `style={{ bottom, right }}` ou via coordenadas absolutas.

3. **Snap to edge**: No `onDragEnd`, calcular se o botao esta mais perto da borda esquerda ou direita e ajustar horizontalmente. Manter a posicao vertical onde o usuario soltou (com limites min/max para nao sair da tela).

4. **Janela do chat segue o botao**: Quando abrir o chat, posicionar o `motion.div` do chat window proximo ao botao (respeitando limites da viewport).

### Comportamento esperado

- O usuario toca/clica e arrasta o botao para qualquer posicao na tela
- Ao soltar, o botao desliza suavemente para a borda horizontal mais proxima (esquerda ou direita)
- A posicao vertical e mantida onde o usuario soltou
- Ao recarregar a pagina, o botao aparece na ultima posicao salva
- Toque curto (sem arrastar) continua abrindo o chat normalmente
- A janela do chat abre do lado correto (esquerda ou direita) baseado na posicao do botao

### Implementacao resumida

```text
Estado:
  - btnPosition = localStorage "support-btn-pos" || { side: "right", y: window.innerHeight - 80 }

Botao:
  - motion.button com drag habilitado
  - dragConstraints = ref do documento (viewport)
  - onDragEnd: calcular snap, salvar no localStorage
  - style dinâmico: left/right + bottom baseado em btnPosition

Chat window:
  - Se botao esta na esquerda: fixed bottom-X left-6
  - Se botao esta na direita: fixed bottom-X right-6
```

Apenas o arquivo `SupportChatbot.tsx` sera modificado. Nenhuma dependencia nova necessaria.
