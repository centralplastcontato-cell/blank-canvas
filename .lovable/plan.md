

# Corrigir: Bot repete pergunta do mes por causa de numeros em emoji

## Problema identificado

A pergunta de "mes" do Planeta Divertido usa **numeros em emoji** no texto:
```
2️⃣ Fevereiro
3️⃣ Março
...
🔟 Outubro
1️⃣2️⃣ Dezembro
```

Porem, a funcao `extractOptionsFromQuestion` so reconhece formatos como `*2* - Fevereiro` ou `2 - Fevereiro` (digitos plain text). Quando o usuario responde "12" (Dezembro), o sistema nao consegue extrair as opcoes customizadas, cai no fallback `MONTH_OPTIONS` (que vai de 1 a 11), e "12" e rejeitado como invalido -- causando a repetição da pergunta com numeracao diferente.

O mesmo problema afeta as outras instancias que usam emojis (Castelo tambem tem esse formato).

## Solucao

Atualizar a funcao `extractOptionsFromQuestion` no `wapi-webhook/index.ts` para reconhecer numeros em formato de emoji (keycap digits como 2️⃣, 3️⃣ e compostos como 1️⃣2️⃣, alem do especial 🔟).

## Alteracao

### Arquivo: `supabase/functions/wapi-webhook/index.ts`

Na funcao `extractOptionsFromQuestion` (linhas 33-46), adicionar um segundo pattern que converte emojis keycap em digitos antes de tentar o match:

1. Adicionar funcao auxiliar `emojiToDigit` que converte `2️⃣` em `2`, `1️⃣0️⃣` em `10`, `🔟` em `10`, etc.
2. Para cada linha, primeiro tentar o regex atual (formatos `*N*` e `N -`)
3. Se nao casar, tentar converter emojis keycap para digitos e re-tentar o match

### Logica da conversao de emoji

```text
function emojiDigitsToNumber(text: string): number | null {
  // Handle special 🔟 = 10
  if (text.includes('🔟')) return 10;
  
  // Extract keycap digits: 0️⃣ through 9️⃣
  const keycapPattern = /([\d])\uFE0F?\u20E3/g;
  let digits = '';
  let match;
  while ((match = keycapPattern.exec(text)) !== null) {
    digits += match[1];
  }
  return digits ? parseInt(digits, 10) : null;
}
```

Exemplos:
- `2️⃣ Fevereiro` -> num=2, value="Fevereiro"
- `1️⃣2️⃣ Dezembro` -> num=12, value="Dezembro"
- `🔟 Outubro` -> num=10, value="Outubro"

### Impacto

- Corrige o Planeta Divertido e qualquer outra instancia que use emojis
- Nao quebra instancias que usam formato `*N* - texto` (o regex atual continua como primeira tentativa)
- Nenhuma alteracao no banco de dados necessaria
