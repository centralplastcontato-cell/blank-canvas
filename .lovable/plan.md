

## Diagnóstico final

O problema persiste porque a correção anterior trocou `px-3` por `px-3 pr-1` — resultando em apenas **4px** de padding à direita. Em dispositivos onde o cálculo de largura do viewport do ScrollArea tem arredondamento de subpixel ligeiramente diferente (varia por modelo de iPhone, versão do Safari, e presença/ausência de scrollbar overlay), esses 4px não são suficientes e o conteúdo vaza pela borda direita.

Na Castelo/Planeta funciona porque a combinação de tamanho de tela + conteúdo resulta em cálculo de flex que cabe. Na Aventura, não.

## Correção (1 linha, conservadora)

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx`

**Linha 3326** — Restaurar padding simétrico e adicionar `overflow-hidden` de volta:

```
// De:
"w-full px-3 pr-1 py-2.5 flex items-center gap-2.5 hover:bg-primary/5 ..."

// Para:
"w-full px-3 py-2.5 flex items-center gap-2.5 overflow-hidden hover:bg-primary/5 ..."
```

- Remove `pr-1` → restaura o `px-3` original (12px ambos os lados)
- Adiciona `overflow-hidden` como safety net

**Por que funciona agora (e não funcionava antes):**
- Antes, `overflow-hidden` + `pr-1` = badge a 4px da borda de clipping → cortava
- Agora, `overflow-hidden` + `px-3` = badge a 12px da borda de clipping → sobra espaço
- O conteúdo interno já tem `flex-1 min-w-0 overflow-hidden` para truncar texto corretamente
- O timestamp tem `shrink-0` e `whitespace-nowrap` para não comprimir
- O badge tem `min-w-6` garantindo largura mínima

**Segurança:** Alteração de uma única classe CSS em um único arquivo. Não afeta desktop (usa ResizablePanel separado). Não altera header, tabs, filtros nem botão flutuante.

