

## Eliminar Texto em Ingles das Imagens Geradas

### Diagnostico

O DALL-E esta gerando texto em ingles ("LIGHTNING OPPORTUNITY", "LIMIT TACTTS", "CASTLE OF FUN") porque:

1. **O prompt inteiro esta em ingles** - o DALL-E interpreta o idioma do prompt e renderiza texto nesse idioma
2. **O nome da empresa esta no prompt** (`"${company_name}"`) - o DALL-E tenta renderizar nomes entre aspas como texto visual
3. **O tema da campanha esta entre aspas** (`"${campaign_theme}"`) - mesma razao acima
4. Instrucoes de "nao coloque texto" sao frequentemente ignoradas pelo DALL-E quando o resto do prompt contem muitas palavras que parecem titulos

### Solucao

Reescrever os prompts com 3 estrategias combinadas:

**1. Prompt 100% em portugues** - reduz drasticamente a chance de texto em ingles

**2. Remover nomes proprios e textos entre aspas** - o DALL-E tende a renderizar qualquer string entre aspas como banner visual. Em vez de `called "${company_name}"`, descrever apenas "buffet infantil" genericamente

**3. Descrever o tema como elementos visuais, nao como texto** - em vez de `Theme: "Volta as Aulas"`, usar `com elementos visuais de escola, mochilas, livros e cadernos coloridos`

### Mudancas

**`supabase/functions/campaign-image/index.ts`**

Reescrever o bloco de construcao do prompt (linha 30-31):

```text
// Antes: prompt em ingles com nome da empresa e tema entre aspas
const prompt = `Create a vibrant... called "${company_name}". Theme: "${campaign_theme}"...`

// Depois: prompt em portugues, sem nomes proprios, tema como elementos visuais
const themeHint = campaign_theme 
  ? `O tema visual deve representar "${campaign_theme}" usando simbolos, cores e elementos decorativos apropriados (sem escrever o nome do tema). ` 
  : "";
const prompt = `Crie uma ilustracao vibrante e festiva para um buffet de festas infantis. ${themeHint}Contexto: ${prompt_context}. Estilo: colorido, alegre, qualidade profissional de marketing. A imagem deve ser uma ilustracao artistica pura, SEM NENHUM texto, letra, palavra, numero, placa, faixa ou caractere escrito em qualquer idioma. Proibido qualquer elemento que contenha escrita. Formato quadrado, alto contraste, adequado para compartilhamento no WhatsApp.`;
```

**`supabase/functions/campaign-compose/index.ts`**

Reescrever o prompt do modo `enhance` (linhas 44-48) tambem em portugues:

```text
// Antes
promptText = `Create a professional, eye-catching promotional image...`

// Depois  
promptText = `Aprimore esta foto para parecer uma arte promocional profissional de buffet infantil. Use a foto fornecida como elemento visual principal.${
  logo_url ? ` Posicione o logotipo da empresa no ${posLabel} da imagem.` : ""
} Adicione elementos decorativos sutis (confetes, baloes, estrelas, fitas) nas bordas. Realce as cores para ficarem vibrantes e convidativas.${
  context ? ` Contexto da campanha: ${context}.` : ""
} REGRA OBRIGATORIA: NAO adicione nenhum texto, letra, palavra, numero, faixa com texto ou caractere escrito de qualquer tipo na imagem. Apenas arte visual.`;
```

E o prompt do modo overlay (linha 60) tambem em portugues.

### Arquivos Modificados

1. `supabase/functions/campaign-image/index.ts` - prompt reescrito em portugues, sem nomes proprios
2. `supabase/functions/campaign-compose/index.ts` - prompts reescritos em portugues

