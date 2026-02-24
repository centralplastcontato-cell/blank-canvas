

# Corrigir logica de limite de convidados

## Problema

A opcao "Acima de 90 pessoas" extrai o numero **90** do texto. A comparacao atual e `90 > 90`, que retorna `false`, entao o redirecionamento nunca e acionado.

## Solucao

Duas mudancas na funcao `exceedsGuestLimit` em `src/components/landing/LeadChatbot.tsx`:

1. Se o texto contem "acima" ou "mais de", tratar como **excedendo** o limite automaticamente (independente do numero extraido)
2. Mudar a comparacao de `>` para `>=` como fallback

## Detalhes Tecnicos

### Arquivo: `src/components/landing/LeadChatbot.tsx`

**Funcao `exceedsGuestLimit` (linhas 126-131)**

De:
```typescript
const exceedsGuestLimit = (guestOption: string): boolean => {
  if (!lpBotConfig?.guest_limit) return false;
  const maxGuests = extractMaxGuests(guestOption);
  return maxGuests > lpBotConfig.guest_limit;
};
```

Para:
```typescript
const exceedsGuestLimit = (guestOption: string): boolean => {
  if (!lpBotConfig?.guest_limit) return false;
  const lower = guestOption.toLowerCase();
  if (lower.includes('acima') || lower.includes('mais de')) return true;
  const maxGuests = extractMaxGuests(guestOption);
  return maxGuests >= lpBotConfig.guest_limit;
};
```

A verificacao por "acima" garante que opcoes como "Acima de 90 pessoas" sempre acionem o redirecionamento, sem depender da comparacao numerica.

