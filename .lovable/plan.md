

## Correção: Mensagem amigável para erro de reação emoji

### Problema
A edge function `wapi-send` ainda retorna HTTP 400 para `send-reaction` (deploy pendente), fazendo `supabase.functions.invoke` lançar exceção. O `catch` na linha 2340 exibe um toast vermelho destrutivo "Erro ao reagir".

### Solução
No `catch` do `handleReaction` (linha 2339-2341 de `WhatsAppChat.tsx`), trocar o toast destrutivo por um toast informativo amigável:

```typescript
} catch (err: any) {
  toast({ title: "😊 Reações indisponíveis", description: "Este recurso não está disponível no momento." });
}
```

- Remove `variant: "destructive"` (sem banner vermelho)
- Mensagem clara e amigável
- 1 linha alterada em 1 arquivo

