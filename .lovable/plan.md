
## Corrigir corte do lado direito na lista de conversas (mobile)

### Problema identificado
Na tela mobile da Central de Atendimento, os itens da lista de conversas estao sendo cortados no lado direito. Isso afeta:
- O menu de tres pontos (ConversationStatusActions)
- O horario da ultima mensagem
- Badges de contagem de nao lidas

### Causa raiz
O container principal do chat (linha 2910 do WhatsAppChat.tsx) usa `overflow-hidden` com `rounded-xl`, e internamente os itens de conversa tem elementos que ultrapassam o limite visivel. Especificamente:
- O container pai tem `border` + `rounded-xl` + `overflow-hidden` que corta o conteudo nos extremos
- Os itens de conversa usam `w-full` mas o padding interno nao compensa o espaco perdido pela borda e arredondamento

### Solucao

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**

1. **Ajustar o container mobile da lista de conversas** (linha ~2910):
   - Remover o `rounded-xl` e `border` do container principal no mobile, pois ele ja esta dentro de um layout que fornece a moldura
   - Ou adicionar padding interno para compensar o corte

2. **Ajustar os itens de conversa mobile** (linhas ~2948-3033):
   - Adicionar `pr-3` ou `pr-4` ao botao de cada conversa para garantir que o lado direito tenha respiro
   - O item atual usa `p-2.5` que pode ser insuficiente para acomodar o `ConversationStatusActions` + timestamp sem corte

3. **Garantir que o `ConversationStatusActions`** nao ultrapasse os limites:
   - Verificar se o componente de status/menu de tres pontos respeita o espaco disponivel

### Mudancas especificas

```text
Antes (linha 2910):
<div className="flex flex-1 border border-border/60 rounded-xl overflow-hidden ...">

Depois:
<div className="flex flex-1 border border-border/60 rounded-xl overflow-hidden md:rounded-xl ...">
  (mobile container interno recebe padding compensatorio)
```

```text
Antes (linha 2952-2953, item de conversa mobile):
className="w-full p-2.5 flex items-center gap-2.5 ..."

Depois:
className="w-full px-3 py-2.5 flex items-center gap-2.5 ..."
```

E na area de status/horario (linhas 2998-3010), garantir que o container `shrink-0` nao empurre conteudo para fora:
- Limitar o `ConversationStatusActions` para nao exceder o espaco
- Reduzir levemente gap ou tamanho do timestamp se necessario

### Resultado esperado
- Lista de conversas mobile mostra todos os elementos visiveis (menu, horario, badges)
- Sem corte no lado direito
- Layout continua identico no desktop (sem regressao)
