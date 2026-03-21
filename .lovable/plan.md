

## Problema

As mensagens do chat WhatsApp estão transbordando horizontalmente no mobile, quebrando o layout. As bolhas de mensagem (especialmente as enviadas com texto em negrito) ultrapassam a largura da tela.

## Causas Raiz

1. O container das mensagens no mobile não tem restrição de largura (`min-w-0` / `overflow-hidden`)
2. O wrapper de cada mensagem usa `w-full` sem conter o overflow dos filhos
3. O texto usa `whitespace-pre-wrap break-words` mas falta `overflow-wrap: anywhere` para quebrar textos longos formatados com negrito do WhatsApp

## Plano de Correção

### Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`

**1. Conter overflow no container de mensagens mobile**
- No div que envolve as mensagens dentro do ScrollArea mobile (~linha 5504), adicionar `overflow-hidden` para impedir scroll horizontal.

**2. Corrigir overflow no wrapper de cada mensagem**
- Nos divs wrapper das mensagens (mobile ~linha 5559, desktop ~linha 4453) que usam `relative w-full`, adicionar `min-w-0 overflow-hidden`.

**3. Forçar quebra de texto nas bolhas**
- Nos elementos `<p>` que renderizam o texto da mensagem (mobile ~linha 5737, desktop ~linha 4643), adicionar a classe `[overflow-wrap:anywhere]` para garantir que textos longos formatados quebrem corretamente.

**4. Reforçar limite no container mobile do chat**
- No container da conversa selecionada no mobile (~linha 5056), garantir `max-w-full` para travar dentro do viewport.

### Resumo
- **1 arquivo editado**: `WhatsAppChat.tsx`
- **4 alterações pontuais** de classes CSS (sem mudança de lógica)
- Correção afeta tanto mensagens enviadas quanto recebidas

