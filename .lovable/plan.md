

## Ajuste na Barra de Status (Pipeline Stepper)

Dois ajustes pontuais na barra de status do chat desktop:

### Problema
- Os botões de status estao grandes demais, causando scroll horizontal desnecessario
- A altura do container esta cortando a borda superior dos elementos

### Alteracoes

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx` (linhas 3321-3404)

1. **Reduzir tamanho dos botoes de status** para eliminar o scroll lateral:
   - Diminuir padding horizontal de `px-3` para `px-2`
   - Reduzir gap entre itens de `gap-1.5` para `gap-1`
   - Reduzir fonte de `text-xs` para `text-[11px]`
   - Diminuir o conector entre etapas de `w-3` para `w-2`

2. **Aumentar altura do container** para nao cortar a moldura superior:
   - Ajustar padding vertical de `py-3` para `py-3.5`
   - Remover o `pb-1` do scroll area (que empurrava conteudo para cima)

### Detalhes tecnicos

```
Container: px-4 py-3 → px-3 py-3.5
Botoes: px-3 py-1.5 gap-1.5 text-xs → px-2 py-1.5 gap-1 text-[11px]
Conector: w-3 mx-0.5 → w-2 mx-0.5
Scroll area: pb-1 removido
```

Mudancas puramente visuais, sem impacto na logica de negocio.

