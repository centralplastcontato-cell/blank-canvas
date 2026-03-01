

# Testes Automatizados -- Fluxos Criticos

Criacao de 7 arquivos de teste unitario cobrindo as funcoes puras mais criticas. Zero interacao com banco, APIs ou WhatsApp. Invisivel para usuarios finais.

## Arquivos a Criar

### 1. `src/lib/__tests__/mask-utils.test.ts`
Testa `maskPhone`:
- Celular 11 digitos, fixo 10 digitos, internacional 13 digitos
- Numeros curtos (<=8 digitos)
- Numeros com formatacao

### 2. `src/lib/__tests__/format-message.test.tsx`
Testa `formatMessageContent`:
- null/undefined retorna inalterado
- URLs viram links clicaveis
- Telefones (10-13 digitos) viram links wa.me
- Texto misto com URLs e telefones

### 3. `src/lib/__tests__/supabase-helpers.test.ts`
Testa `getCurrentCompanyId`:
- Retorna default sem localStorage
- Retorna valor do localStorage

### 4. `src/hooks/__tests__/useDomainDetection.test.ts`
Testa funcoes de dominio:
- `getCanonicalHost`: lowercase, strip www/porta
- `KNOWN_BUFFET_DOMAINS`: mapeamentos
- `isPreviewDomain` e `getKnownBuffetDomain`

### 5. `src/types/__tests__/crm.test.ts`
Testa completude dos mapas:
- Todo `LeadStatus` tem label e cor
- Todo `AppRole` tem label

### 6. `src/components/flowbuilder/__tests__/types.test.ts`
Testa completude:
- Todo `NodeType` tem label e cor
- Todo `ActionType` tem label
- Todo `ExtractField` tem label

### 7. `src/components/admin/__tests__/exportLeads.test.ts`
Testa exportacao CSV:
- Headers corretos
- Mascara telefone quando sem permissao
- Mostra telefone com permissao

## Detalhes Tecnicos

- Framework: Vitest + React Testing Library (ja configurados)
- Total: ~45 casos de teste
- Testa apenas funcoes puras -- zero risco
- Comando: `npm test`
