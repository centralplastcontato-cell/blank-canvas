

## Plano: Corrigir switch de follow-up que trava ao salvar

### Problema
A função `updateBotSettings` (linha 473 de `AutomationsSection.tsx`) define `isSaving = true` no início mas não usa `try/finally`. Se a query de verificação (read-after-write) lançar uma exceção, `setIsSaving(false)` na linha 534 nunca executa — todos os switches ficam permanentemente desabilitados.

### Correção (1 arquivo)

**`src/components/whatsapp/settings/AutomationsSection.tsx`**

Envolver o corpo de `updateBotSettings` em `try/finally` para garantir que `isSaving` sempre volta a `false`:

```typescript
const updateBotSettings = async (updates: Partial<BotSettings>) => {
  if (!botSettings) return;
  setIsSaving(true);
  try {
    // ... lógica existente de update + read-after-write ...
  } catch (err) {
    console.error("Error in updateBotSettings:", err);
    toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
  } finally {
    setIsSaving(false);
  }
};
```

Remove o `setIsSaving(false)` redundante da linha 490 e 534, centralizando no `finally`.

