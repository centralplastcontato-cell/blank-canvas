

## Diagnóstico

O problema é o `overflow-hidden` adicionado no botão de cada conversa (linha 3326) na correção anterior. Esse `overflow-hidden` no botão **corta fisicamente** qualquer conteúdo que toque a borda direita — incluindo o timestamp e o badge azul. No Safari/iPhone, onde o cálculo de largura de flex items pode ter arredondamento de subpixel diferente, o corte fica mais evidente.

Na Trujillo funciona porque lá as conversas não têm `lead_id` (sem ícone Link2), então o conteúdo é ligeiramente mais estreito e não encosta na borda.

## Correção (2 linhas)

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx`

**1. Linha 3326 — Remover `overflow-hidden` do botão e adicionar `pr-1` para respiro:**
```
// De:
"w-full px-3 py-2.5 flex items-center gap-2.5 overflow-hidden hover:bg-primary/5 ..."
// Para:
"w-full px-3 pr-1 py-2.5 flex items-center gap-2.5 hover:bg-primary/5 ..."
```
O `overflow-hidden` no botão é removido (era ele que cortava a lateral direita). O `pr-1` garante respiro à direita. Os filhos internos já têm `min-w-0` e `overflow-hidden` próprios para truncar texto.

**2. Linha 3358 — Remover `max-w-full` redundante:**
```
// De:
"flex-1 min-w-0 overflow-hidden max-w-full"
// Para:
"flex-1 min-w-0 overflow-hidden"
```
O `max-w-full` é redundante com `flex-1 min-w-0` e pode causar cálculo de largura incorreto no Safari (100% do pai vs largura restante após avatar).

## Por que é seguro

- `flex-1 min-w-0` na coluna central já garante que texto trunca sem empurrar a coluna direita
- `shrink-0` no timestamp e avatar já protege esses elementos
- O `overflow-hidden` permanece no div de conteúdo interno (linha 3358) onde é necessário para truncar texto
- Desktop não é afetado (usa ResizablePanel separado)
- Nenhuma mudança em header, tabs, filtros, botão flutuante ou componentes globais

