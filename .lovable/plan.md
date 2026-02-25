

# Corrigir exibicao vertical das fotos no WhatsApp

## Problema

As fotos do espaco estao sendo enviadas uma por uma com **3 segundos de intervalo**, o que faz o WhatsApp exibir cada imagem como mensagem separada (na vertical). No WhatsApp nativo, quando multiplas imagens sao enviadas rapidamente e sem legenda, elas aparecem agrupadas como um **album**.

## Causa raiz

No arquivo `supabase/functions/wapi-webhook/index.ts`, linha 2820:

```text
await new Promise(r => setTimeout(r, 3000));  // 3 segundos entre fotos
```

Esse intervalo de 3 segundos e muito longo - o WhatsApp nao agrupa as imagens como album.

## Regras do WhatsApp para album

Segundo a documentacao oficial:
- Precisa de pelo menos 4 imagens em sequencia
- Imagens NAO podem ter legenda (caption) - o codigo ja envia sem legenda, entao isso esta OK
- As imagens precisam ser enviadas em sequencia rapida (sem grandes intervalos)

## Solucao

### 1. Reduzir o intervalo entre fotos

**Arquivo**: `supabase/functions/wapi-webhook/index.ts` (linha ~2816-2822)

Reduzir o delay entre fotos de 3000ms para **800ms** (suficiente para nao sobrecarregar a API, mas rapido o bastante para o WhatsApp agrupar como album).

De:
```
await new Promise(r => setTimeout(r, 3000));
```
Para:
```
await new Promise(r => setTimeout(r, 800));
```

### 2. Garantir que as fotos nao tem caption

O codigo ja envia com caption vazio (`''`), entao esse ponto esta OK. Apenas validar que permanece assim.

### 3. Deploy da edge function

Re-deploy do `wapi-webhook` para aplicar a mudanca.

## Observacao importante

- Se a colecao tiver menos de 4 fotos, o WhatsApp pode nao agrupar como album (isso e comportamento nativo do WhatsApp, nao temos controle)
- O intervalo de 800ms e seguro para o plano W-API Lite e evita rate limiting
- A mudanca afeta apenas o envio de colecoes de fotos do bot, nao outros tipos de midia

## Resultado esperado

- Fotos enviadas pelo bot aparecerao agrupadas como album no WhatsApp do celular
- Mesmo visual que quando alguem envia varias fotos de uma vez pelo WhatsApp
