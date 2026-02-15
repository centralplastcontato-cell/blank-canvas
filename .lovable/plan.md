
## Corrigir: Bot aceita frases como nome do lead

### Problema
A funcao `validateName` aceita qualquer texto que contenha apenas letras e espacos. Quando a Amanda mandou "Vi que tem promoção no Instagram" antes de dizer o nome, o bot interpretou a frase inteira como nome -- porque passou na validacao (so letras e espacos).

### Solucao
Adicionar validacoes extras na funcao `validateName` para rejeitar textos que claramente nao sao nomes:

1. **Limite de palavras**: Nomes reais raramente tem mais de 4-5 palavras. Rejeitar textos com mais de 5 palavras
2. **Limite de caracteres**: Nomes completos raramente passam de 50 caracteres. Rejeitar textos muito longos
3. **Deteccao de frases**: Verificar se o texto contem palavras comuns de frases/perguntas que nao sao nomes (ex: "que", "tem", "no", "como", "quero", "vi", "olá", "oi", "bom dia", "instagram", "promoção", etc.)

### O que muda para o usuario
- Quando alguem mandar uma frase em vez do nome, o bot responde pedindo apenas o nome
- Nomes reais (inclusive compostos como "Maria Clara") continuam funcionando normalmente

### Detalhes tecnicos

**Arquivo: `supabase/functions/wapi-webhook/index.ts`**

Modificar a funcao `validateName` (linhas 78-109) para adicionar apos a validacao de regex:

```typescript
// Reject if too many words (names rarely have more than 5 words)
const words = name.split(/\s+/).filter(w => w.length > 0);
if (words.length > 5) {
  return { valid: false, error: 'Hmm, parece uma frase 🤔\n\nPor favor, digite apenas seu *nome*:' };
}

// Reject if contains common non-name words (phrases/sentences)
const nonNameWords = [
  'que', 'tem', 'como', 'quero', 'queria', 'gostaria', 'preciso',
  'vi', 'vou', 'estou', 'tenho', 'pode', 'posso', 'sobre',
  'instagram', 'facebook', 'whatsapp', 'site', 'promoção', 'promocao',
  'preço', 'preco', 'valor', 'orçamento', 'orcamento',
  'festa', 'evento', 'buffet', 'aniversário', 'aniversario',
  'obrigado', 'obrigada', 'por favor', 'bom dia', 'boa tarde', 'boa noite',
  'olá', 'ola', 'oi', 'hey', 'hello',
];
const lowerName = name.toLowerCase();
const hasNonNameWord = nonNameWords.some(w => {
  // Match whole word to avoid false positives (e.g., "Valentina" containing "vi")
  const regex = new RegExp(`\\b${w}\\b`, 'i');
  return regex.test(lowerName);
});
if (hasNonNameWord) {
  return { valid: false, error: 'Hmm, não consegui entender seu nome 🤔\n\nPor favor, digite apenas seu *nome*:' };
}
```

Apos a alteracao, sera necessario fazer deploy da edge function `wapi-webhook`.
