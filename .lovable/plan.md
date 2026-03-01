

# Testes Deno para Edge Functions (wapi-webhook e submit-lead)

## Seguranca — Por que NAO ha risco

- Os testes ficam em arquivos `_test.ts` separados e NUNCA sao executados em producao
- Nenhuma linha do codigo das Edge Functions e modificada
- As funcoes auxiliares sao **copiadas** para os arquivos de teste (mesmo padrao ja usado no `validate_name_test.ts` existente)
- Zero chamadas ao banco, zero chamadas a W-API, zero interacao com instancias WhatsApp
- Nao afeta deploy, conexao, sessao ou qualquer fluxo de usuario

## Arquivos a Criar

### 1. `supabase/functions/wapi-webhook/bot_helpers_test.ts`
Testa funcoes puras do bot (copiadas do index.ts para isolamento total):

- **emojiDigitsToNumber**: converte emojis keycap para numeros (2 para 2, keycap 12 para 12, emoji 10 para 10)
- **extractOptionsFromQuestion**: extrai opcoes de texto formatado ("1 - Opcao A", "*2* - Opcao B")
- **numToKeycap**: converte numeros para emojis keycap
- **buildMenuText**: monta texto de menu formatado
- **validateName**: aceita nomes validos ("Maria Clara", "meu nome e Victor"), rejeita frases ("Quero saber o valor", "Vi no Instagram")
- **validateMenuChoice**: aceita numero correto, texto similar, rejeita inputs invalidos
- **validateAnswer**: roteamento correto por step (nome, tipo, mes, dia, convidados, proximo_passo)

Total: ~30 casos de teste

### 2. `supabase/functions/submit-lead/validation_test.ts`
Testa funcoes de validacao do submit-lead (copiadas do index.ts):

- **validateName**: obrigatoriedade, min/max caracteres, caracteres suspeitos (`<>{}`)
- **validateWhatsApp**: obrigatoriedade, normalizacao (remove formatacao), min/max digitos
- **validateCampaignId**: obrigatoriedade, tamanho maximo
- **validateUnit**: opcional, tamanho maximo
- **validateMonth**: aceita meses validos com/sem ano ("Marco", "Marco/27"), rejeita invalidos
- **validateDayOfMonth**: range 1-31, rejeita 0 e 32
- **validateGuests**: opcional, tamanho maximo

Total: ~25 casos de teste

## Detalhes Tecnicos

- Framework: Deno.test() nativo (mesmo padrao do `validate_name_test.ts` ja existente no projeto)
- Asserts: `assertEquals` do `https://deno.land/std@0.208.0/assert/`
- Padrao: funcoes copiadas para isolamento total (sem import do index.ts, sem dependencias externas)
- Execucao: via ferramenta `test-edge-functions` do Lovable
- Total: ~55 novos casos de teste
- Nenhuma Edge Function existente e tocada ou modificada

