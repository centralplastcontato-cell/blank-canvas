

## Corrigir navegacao de notificacao para abrir conversa no chat

### Problema
Quando o usuario clica em "Abrir Chat" na notificacao, o sistema navega para `/atendimento?phone=XXX`, mas a conversa nao abre. Isso acontece porque:

1. O componente `WhatsAppChat` tem uma flag `initialPhoneProcessed` que e marcada como `true` apos o primeiro uso e **nunca e resetada**
2. Quando o usuario ja esta em `/atendimento` e clica numa segunda notificacao, a flag impede que a nova conversa seja buscada e selecionada

### Solucao

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**

Adicionar um `useEffect` que reseta `initialPhoneProcessed` sempre que o valor de `initialPhone` muda. Assim, cada nova navegacao via notificacao dispara corretamente a busca da conversa.

```text
// Novo useEffect (antes do useEffect da linha 689):
useEffect(() => {
  if (initialPhone) {
    setInitialPhoneProcessed(false);
    setDraftApplied(false);
  }
}, [initialPhone]);
```

**Arquivo: `src/pages/CentralAtendimento.tsx`**

Garantir que o `useEffect` que lida com `searchParams` tambem reseta o `initialPhone` antes de atribuir o novo valor, forcando o React a detectar a mudanca mesmo quando o telefone e o mesmo:

```text
// No useEffect da linha 102-125:
// Antes de setar o novo initialPhone, limpar o anterior
setInitialPhone(null);
// ...depois setar o novo valor
setInitialPhone(phoneParam);
```

### Resultado esperado
- Cada clique em "Abrir Chat" nas notificacoes abre a conversa correta, mesmo quando o usuario ja esta na Central de Atendimento
- Funciona para todas as notificacoes: cliente existente, visita agendada, transferencia e leads
- Nao quebra o comportamento normal de navegacao inicial

