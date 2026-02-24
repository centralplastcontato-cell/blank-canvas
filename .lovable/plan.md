

## Reordenar envio de materiais: PDF sempre por ultimo

### Problema atual
A sequencia atual no bot e:
1. Fotos do espaco
2. Video de apresentacao
3. **PDF/Pacote de precos** (posicao 3)
4. Video promocional

### Nova sequencia desejada
1. Fotos do espaco
2. Video de apresentacao
3. Video promocional
4. **PDF/Pacote de precos** (sempre por ultimo)

### Correcoes incluidas

Alem da reordenacao, tambem sera corrigido o problema de classificacao de videos discutido anteriormente:
- **Antes**: videos so eram reconhecidos como "apresentacao" se tivessem "apresentacao" no nome
- **Depois**: qualquer video que NAO seja promo/carnaval sera tratado como video de apresentacao

### Mudanca tecnica

**Arquivo: `supabase/functions/wapi-webhook/index.ts`** (funcao `sendQualificationMaterials`)

1. **Linhas ~2648-2649** -- Corrigir classificacao de videos:

```text
Antes:
  presentationVideos = videos com "apresentação" no nome
  promoVideos = videos com "promo" ou "carnaval" no nome

Depois:
  promoVideos = videos com "promo" ou "carnaval" no nome
  presentationVideos = todos os outros videos
```

2. **Blocos 3 e 4 (linhas ~2784-2854)** -- Trocar a ordem:
   - Bloco 3 passa a ser: Envio do Video Promocional
   - Bloco 4 passa a ser: Envio do PDF/Pacote de precos (ultimo material antes da proxima pergunta)

### Resultado

| Empresa | Sequencia |
|---|---|
| Castelo da Diversao | Fotos -> Video Apresentacao -> Video Carnaval -> PDF |
| Planeta Divertido | Fotos -> Video do Espaco -> Video Promo -> PDF |
| Qualquer outra | Fotos -> Videos -> PDF (sempre por ultimo) |

O PDF sendo o ultimo material garante que o lead recebe primeiro o conteudo visual/emocional e so depois o preco, aumentando o engajamento.

