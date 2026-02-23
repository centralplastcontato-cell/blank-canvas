

# Reativar reacoes com emoji no chat do WhatsApp

## Problema

As reacoes com emoji foram desabilitadas no frontend, exibindo a mensagem "Recurso temporariamente indisponivel" ao clicar em um emoji. O suporte da W-API confirmou que o plano Lite suporta essa funcionalidade, entao o bloqueio no frontend precisa ser removido.

## Situacao atual

- **Frontend** (`WhatsAppChat.tsx`, linha ~1879): A funcao `handleReaction` foi substituida por um simples toast que bloqueia a acao
- **Backend** (`wapi-send/index.ts`, linhas 1259-1322): A logica de `send-reaction` ja esta implementada e funcional, tentando 4 combinacoes de endpoint/metodo (POST/PUT com send-reaction/sendReaction)

## Solucao

Restaurar a funcao `handleReaction` para efetivamente chamar a Edge Function `wapi-send` com a action `send-reaction`.

### Alteracao unica em `src/components/whatsapp/WhatsAppChat.tsx`

Substituir o handler atual (linha ~1879):

```typescript
// DE:
const handleReaction = async (_msg: Message, _emoji: string) => {
  toast({ title: "Recurso temporariamente indisponível", ... });
};

// PARA:
const handleReaction = async (msg: Message, emoji: string) => {
  if (!selectedInstance || !msg.message_id) return;
  try {
    const response = await supabase.functions.invoke("wapi-send", {
      body: {
        action: "send-reaction",
        instanceId: selectedInstance.instance_id,
        instanceToken: selectedInstance.instance_token,
        messageId: msg.message_id,
        emoji,
      },
    });
    if (response.error) throw new Error(response.error.message);
    if (response.data?.error) {
      toast({ title: "Erro", description: response.data.error, variant: "destructive" });
    }
  } catch (err: any) {
    toast({ title: "Erro ao reagir", description: err.message, variant: "destructive" });
  }
};
```

## Arquivo a editar

| Arquivo | Alteracao |
|---|---|
| `src/components/whatsapp/WhatsAppChat.tsx` | Restaurar `handleReaction` para chamar a API (linhas 1879-1881) |

## Resultado esperado

Ao clicar em um emoji no menu de contexto, o sistema chamara a Edge Function que ja existe no backend, enviando a reacao via W-API. Se houver algum erro real da API, ele sera exibido ao usuario em vez da mensagem generica de "indisponivel".

