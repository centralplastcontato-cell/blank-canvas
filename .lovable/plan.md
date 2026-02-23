

# Tornar a opcao "Trabalhe Conosco" generica (sem "Castelo")

## O que muda

Remover todas as referencias fixas a "Castelo" no webhook e na interface, substituindo por textos genericos ou usando a variavel `{empresa}` para que cada buffet veja seu proprio nome.

## Arquivos e alteracoes

### 1. `supabase/functions/wapi-webhook/index.ts`

**Constante TIPO_OPTIONS (linha 62):**
- De: `'Trabalhe no Castelo'`
- Para: `'Trabalhe Conosco'`

**Validacao wantsWork (linha 2032):**
- De: `validation.value === 'Trabalhe no Castelo'`
- Para: `validation.value === 'Trabalhe Conosco'`

**Mensagem default de RH (linha 2037):**
- De: `fazer parte do nosso time! 🏰✨`
- Para: `fazer parte do nosso time! 💼✨` (remove emoji do castelo)

**Notificacoes internas (linhas 2095-2096):**
- De: `trabalhar no Castelo`
- Para: `trabalhar na empresa` ou usar o nome da empresa se disponivel

**Mensagens de visita/proximo-passo (linhas 2188, 2201):**
- De: `Castelo da Diversão` / `no Castelo`
- Para: usar `{empresa}` ou texto generico `no buffet`

### 2. `supabase/functions/follow-up-check/index.ts`

**DEFAULT_QUESTIONS_MAP tipo (linha 737):**
- De: `*3* - Trabalhe no Castelo`
- Para: `*3* - Trabalhe Conosco`

### 3. `src/components/whatsapp/settings/AutomationsSection.tsx`

**Label e descricao do campo RH (linhas 906-909):**
- De: `Mensagem de RH (Trabalhe no Castelo)` e `"Trabalhe no Castelo"`
- Para: `Mensagem de RH (Trabalhe Conosco)` e `"Trabalhe Conosco"`

**Placeholder do textarea (linha 916):**
- De: `🏰✨`
- Para: `💼✨`

## Resultado

Todos os textos ficam genericos. O buffet pode personalizar a mensagem de RH pelo campo editavel na aba Automacoes, e a opcao 3 do bot funciona para qualquer empresa sem mencionar "Castelo".

