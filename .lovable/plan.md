

# Corrigir "nosso buffet" no chatbot da LP do Castelo

## Problema

Na linha 67 do `LeadChatbot.tsx`, o fallback quando nenhum `companyName` e passado e `"nosso buffet"`:

```typescript
const displayName = companyName || "nosso buffet";
```

A LP estatica do Castelo (`LandingPage.tsx`, linha 37) chama o chatbot **sem passar `companyName`**, entao:
- O header mostra "nosso buffet"
- A mensagem do WhatsApp diz "Vim pelo site do *nosso buffet*"

## Solucao

Trocar o fallback de `"nosso buffet"` para `"Castelo da Diversao"` na linha 67 do `LeadChatbot.tsx`:

```typescript
const displayName = companyName || "Castelo da Diversão";
```

## Detalhes Tecnicos

### Arquivo: `src/components/landing/LeadChatbot.tsx`

- **Linha 67**: Alterar `"nosso buffet"` para `"Castelo da Diversão"`

Essa unica mudanca corrige tanto o header do chatbot quanto a mensagem enviada no WhatsApp, pois ambos usam a variavel `displayName`.

