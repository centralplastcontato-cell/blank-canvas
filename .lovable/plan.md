

## Corrigir: Som tocando mesmo com "Mudo" ativado

### Problema
O botao "Mudo" controla o estado em `useChatNotificationToggle`, mas dois hooks **ignoram completamente** esse estado e tocam som sempre:

1. **`useAppNotifications.ts`** -- toca som para toda notificacao nova (lead, visita, cliente, etc.) sem verificar se esta no mudo
2. **`useLeadNotifications.ts`** -- toca som para todo novo lead inserido sem verificar se esta no mudo

Os banners (ClientAlert, VisitAlert, QuestionsAlert) ja respeitam o mudo corretamente.

### Solucao

**Arquivo 1: `src/hooks/useAppNotifications.ts`**
- Importar `useChatNotificationToggle`
- Criar um `ref` para manter o valor atual de `notificationsEnabled` acessivel dentro do callback do realtime
- Envolver os `playSound()` (linhas 147-161) com `if (notificationsEnabledRef.current)` 
- Fazer o mesmo para `showBrowserNotification` (linhas 164-168)

**Arquivo 2: `src/hooks/useLeadNotifications.ts`**
- Importar `useChatNotificationToggle`
- Criar um `ref` para o estado do mudo
- Envolver o `playLeadSound()` (linha 29) com `if (notificationsEnabledRef.current)`

### Detalhes tecnicos

Ambos os hooks usam callbacks em subscricoes realtime, entao precisam de um `useRef` para manter o valor atualizado do toggle (mesmo padrao ja usado nos banners de alerta). O fluxo:

```text
useChatNotificationToggle() -> notificationsEnabled (state)
        |
        v
useEffect -> notificationsEnabledRef.current = notificationsEnabled
        |
        v
Realtime callback -> if (notificationsEnabledRef.current) { playSound() }
```

Nenhuma mudanca de UI necessaria -- o botao "Mudo" ja existe e funciona; apenas os sons serao silenciados corretamente.

