

## Diagnóstico: Layout quebrado na lista de conversas (Manchester)

### O que aconteceu

Na linha **3378** do `WhatsAppChat.tsx`, o componente `ConversationStatusActions` recebeu `className="opacity-100"`, que força o botão de três pontos (⋮) a ficar **sempre visível**. 

O componente por padrão usa `opacity-0 group-hover:opacity-100` (só aparece no hover). Com o override `opacity-100`, o botão fica permanentemente visível e **ocupa espaço no layout**, empurrando o timestamp para fora da tela no mobile.

Na unidade Trujillo funcionava porque as conversas não têm leads vinculados — o componente retorna `null` e não renderiza nada. Na Manchester, com leads vinculados, o botão aparece e quebra o layout.

**Isso provavelmente foi adicionado em algum momento recente para facilitar o acesso ao menu de status, mas não foi testado no mobile com conversas que têm leads.**

### Correção

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx`, linha 3378

- **Remover** `className="opacity-100"` do `ConversationStatusActions`
- Isso restaura o comportamento padrão: botão invisível, aparece só no hover (desktop), e não ocupa espaço no mobile
- No mobile, o usuário acessa o status ao abrir a conversa, não precisa do botão na lista

