

## Diagnóstico

O problema está na **linha 3358** do `WhatsAppChat.tsx`:

```tsx
<div className="flex-1 min-w-0 overflow-hidden">
```

Este `overflow-hidden` no div de conteúdo principal (que contém nome, timestamp, preview e badge) **corta fisicamente** qualquer pixel que ultrapasse a largura calculada do flex item. Em viewports onde o cálculo de subpixel do Safari resulta em 1-2px a menos de espaço (varia por modelo de iPhone, presença de safe-area insets, e conteúdo específico do tenant), o timestamp e o badge à direita são cortados.

**Por que só afeta Aventura Kids:** Este tenant tem conversas com `lead_id` (ícone Link2 ao lado do nome), nomes mais longos, e possivelmente mais banners ativos — tudo junto empurra a coluna direita para mais perto da borda do container. O arredondamento de subpixel do Safari faz os últimos pixels desaparecerem sob o `overflow-hidden`.

**Por que a remoção é segura:** Os textos que precisam truncar já têm seus próprios mecanismos de truncamento:
- Nome (linha 3361): `truncate` + container com `overflow-hidden` (linha 3360)
- Preview (linha 3389): `truncate block`

O `overflow-hidden` na linha 3358 é redundante — `min-w-0` sozinho já permite que o flex item encolha corretamente sem cortar conteúdo renderizado.

## Correção (1 linha)

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx`, linha 3358

```tsx
// De:
<div className="flex-1 min-w-0 overflow-hidden">

// Para:
<div className="flex-1 min-w-0">
```

Remove `overflow-hidden` do wrapper de conteúdo. O `min-w-0` continua permitindo o flex shrink correto. Os filhos (nome, preview) já têm truncamento próprio. O timestamp (`shrink-0 whitespace-nowrap`) e o badge (`min-w-6`) ficam livres do clipping.

## Impacto

- **Aventura Kids:** timestamp e badge param de ser cortados
- **Outros tenants:** sem alteração visual (o `overflow-hidden` já não estava atuando neles porque o conteúdo cabia)
- **Desktop:** não afetado (usa ResizablePanel separado)
- **Nenhuma** alteração em header, tabs, filtros, banners ou botão flutuante

