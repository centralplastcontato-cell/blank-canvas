

# Correcao: Nome do convidado nos follow-ups do Bot Festa

## Problema

Quando o SendBotDialog envia a primeira mensagem, ele monta o texto localmente com o nome do convidado (ex: "Victor"). Porem, ao criar a conversa no WhatsApp, o sistema salva o numero de telefone como `contact_name` e nunca preenche `bot_data.nome`.

Resultado: os follow-ups automaticos (bot inativo, lembrete proximo passo) usam o numero de telefone no lugar do nome.

## Solucao

Duas alteracoes simples:

### 1. Edge Function `wapi-send` - Aceitar parametro `contactName`

Modificar a funcao `findOrCreateConversation` para aceitar um parametro opcional `contactName`. Quando presente:
- Usar como `contact_name` ao criar uma conversa nova
- Salvar em `bot_data.nome` para que os follow-ups usem o nome correto
- Se a conversa ja existir e `contact_name` for um numero, atualizar com o nome real

### 2. SendBotDialog - Enviar o nome do convidado

Passar o nome do convidado no body da chamada ao `wapi-send`:

```text
body: {
  action: "send-text",
  phone,
  message,
  instanceId,
  instanceToken,
  lpMode: true,
  contactName: guest.name   // <-- novo parametro
}
```

## Detalhes tecnicos

### Arquivo: `supabase/functions/wapi-send/index.ts`

**Funcao `findOrCreateConversation`**:
- Adicionar parametro `contactName?: string`
- Na criacao (insert): usar `contactName || cleanPhone` como `contact_name`
- Na criacao: adicionar `bot_data: { nome: contactName }` quando disponivel
- Na atualizacao (lpMode existente): tambem atualizar `contact_name` e `bot_data.nome` se `contactName` for fornecido

**No handler principal**:
- Extrair `contactName` do body
- Repassar para `findOrCreateConversation`

### Arquivo: `src/components/agenda/SendBotDialog.tsx`

- Adicionar `contactName: guest.name` no body do `supabase.functions.invoke("wapi-send", ...)`

## Resultado esperado

Os follow-ups automaticos passarao a usar "Oi Victor, notei que voce..." em vez de "Oi 15981121710, notei que voce..."

