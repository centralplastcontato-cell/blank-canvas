

## Corrigir mensagem de limite de convidados no WhatsApp

### Problema
Quando um lead seleciona uma opcao acima do limite de convidados na LP, a mensagem enviada pelo WhatsApp mostra um valor errado (ex: "91" em vez de "90"). Isso acontece porque:

1. A mensagem do WhatsApp NAO usa a mensagem personalizada configurada em "Bot LP". Ela monta um texto proprio com o numero do limite
2. A logica de deteccao de "acima do limite" usa `>=` (maior ou igual), entao selecionar exatamente "90 PESSOAS" com limite 90 tambem dispara o redirecionamento (deveria permitir 90)

### Solucao

**Arquivo: `src/components/landing/LeadChatbot.tsx`**

1. **Usar a mensagem personalizada no WhatsApp** (linha ~371): Em vez de montar o texto fixo `Nossa capacidade maxima e de ${redirectInfo.limit} convidados`, passar a mensagem customizada do `lp_bot_settings` para a funcao `sendWelcomeMessage` e usa-la no corpo do WhatsApp

2. **Corrigir comparacao de limite** (linha ~141): Mudar `maxGuests >= lpBotConfig.guest_limit` para `maxGuests > lpBotConfig.guest_limit`. Assim, selecionar "90 PESSOAS" com limite 90 NAO dispara o redirecionamento (90 cabe no buffet). Apenas opcoes acima de 90 disparam.

### Mudancas tecnicas

**LeadChatbot.tsx - Corrigir comparacao de limite (linha 141):**
```typescript
// Antes:
return maxGuests >= lpBotConfig.guest_limit;

// Depois:
return maxGuests > lpBotConfig.guest_limit;
```

**LeadChatbot.tsx - Passar mensagem customizada para a funcao de WhatsApp (linhas 447-450):**
```typescript
// Antes:
const redirectInfo = isRedirected ? {
  partnerName: lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro',
  limit: lpBotConfig?.guest_limit || 0,
} : undefined;

// Depois:
const redirectInfo = isRedirected ? {
  partnerName: lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro',
  limit: lpBotConfig?.guest_limit || 0,
  customMessage: lpBotConfig?.guest_limit_message || null,
} : undefined;
```

**LeadChatbot.tsx - Usar mensagem customizada no corpo do WhatsApp (linha 371):**
```typescript
// Antes:
const message = redirectInfo
  ? `Ola! ...Nossa capacidade maxima e de ${redirectInfo.limit} convidados...`
  : `Ola! ...`;

// Depois:
const redirectText = redirectInfo.customMessage
  ? redirectInfo.customMessage
  : `Nossa capacidade maxima e de ${redirectInfo.limit} convidados`;
const message = redirectInfo
  ? `Ola! ...\n\n${redirectText}\nSeus dados foram encaminhados...`
  : `Ola! ...`;
```

**supabase/functions/wapi-webhook/index.ts - Corrigir fallback (linha 2249):**
```typescript
// Antes (usa guest_limit - 1, gerando "91 - 1 = 90" mas se guest_limit=91 gera "90"):
const redirectMsg = settings.guest_limit_message || 
  `Nossa capacidade maxima e de ${settings.guest_limit - 1} convidados...`;

// Depois (usa o valor direto, sem subtrair):
const redirectMsg = settings.guest_limit_message || 
  `Nossa capacidade maxima e de ${settings.guest_limit} convidados...`;
```

### Resultado esperado
- A mensagem no WhatsApp vai usar o texto personalizado configurado em "Bot LP" (ex: "Nossa capacidade maxima e de 90 convidados")
- Selecionar "90 PESSOAS" com limite 90 NAO dispara redirecionamento (90 cabe)
- Selecionar "+ DE 90 PESSOAS" com limite 90 DISPARA redirecionamento corretamente
- O fallback do wapi-webhook tambem usa o valor correto sem subtrair 1

