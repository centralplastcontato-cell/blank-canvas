

## Problema: Nome do lead sumindo na lista de conversas

### Diagnóstico

O lead **Nycolly** tem o nome correto na tabela `campaign_leads`, mas a conversa vinculada em `wapi_conversations` tem `contact_name = "."`. A lista de conversas exibe apenas `contact_name`, ignorando o nome do lead vinculado.

Existem **5 conversas** com esse problema no banco (contact_name = ".", null, ou vazio).

### Causa raiz (dois problemas)

1. **Display**: A lista de conversas usa `conv.contact_name || conv.contact_phone` em vez de priorizar o nome do lead vinculado (`conversationLeadsMap`). Como `"."` e é truthy, exibe o ponto ao invés do nome real.

2. **Sanitização**: Quando o bot salva nomes como `"."`, `"-"` ou `""`, o sistema não limpa esses valores placeholder.

### Correção

**1. Priorizar nome do lead na lista de conversas** (WhatsAppChat.tsx)

Criar uma helper function que resolve o nome na ordem correta:
```
leadName (do conversationLeadsMap) > contact_name (se válido) > contact_phone
```

Aplicar em todos os pontos de exibição do nome na lista:
- Linha 3086 (avatar fallback - desktop)
- Linha 3109 (nome na lista - desktop)  
- Linha 3219 (avatar fallback - mobile)
- Linha 3242 (nome na lista - mobile)

**2. Sanitizar contact_name com placeholders inválidos**

Na função que carrega conversas, limpar `contact_name` quando for `"."`, `"-"`, `""` ou espaço em branco.

**3. Corrigir dados existentes no banco**

Atualizar as 5 conversas com `contact_name` inválido para usar o nome do lead vinculado (quando existir).

### Impacto
- A Nycolly e outros leads com nomes "sujos" passarão a exibir o nome correto imediatamente
- Futuros leads com placeholders inválidos serão tratados automaticamente
