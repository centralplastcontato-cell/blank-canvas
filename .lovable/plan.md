

## Remover mensagem duplicada/hardcoded no WhatsApp (redirect de convidados)

### Problema
Quando o lead excede o limite de convidados, a mensagem enviada no WhatsApp contem duas partes com conteudo repetido:

1. A mensagem personalizada (editavel em Bot LP): "Para melhor lhe atender, podemos direcionar seu contato para o Buffet Mega Magic..."
2. Uma frase hardcoded (NAO editavel): "Seus dados foram encaminhados para o *Buffet Mega Magic*, proximo de nos, que entrara em contato em breve..."

Isso gera uma mensagem confusa e redundante no WhatsApp.

### Solucao

**Arquivo: `src/components/landing/LeadChatbot.tsx` (linha 374)**

Quando existe uma mensagem personalizada (`customMessage`), usar SOMENTE ela, sem adicionar a frase hardcoded. O fallback (sem mensagem customizada) continua incluindo a frase padrao.

```text
Antes (linha 374):
${redirectText} :blush:
Seus dados foram encaminhados para o *${partnerName}*, proximo de nos...
Obrigado pelo interesse!

Depois (com customMessage):
${redirectText}
Obrigado pelo interesse!

Depois (sem customMessage - fallback):
Nossa capacidade maxima e de ${limit} convidados :blush:
Seus dados foram encaminhados para o *${partnerName}*, proximo de nos...
Obrigado pelo interesse!
```

### Resultado esperado
- A mensagem do WhatsApp mostra APENAS o texto configurado em "Bot LP", sem duplicacao
- O fallback (quando nao ha mensagem personalizada) continua funcionando normalmente com o texto padrao completo
