

## Corrigir Modo de Teste do Bot (numero nao reconhecido)

### Problema identificado

O bot nao reconhece o numero de teste porque a comparacao de telefone falha. O numero salvo e `034991935048` (com zero na frente do DDD), mas o WhatsApp envia `553491935048` (codigo do pais 55 + DDD sem zero).

A logica atual faz:
```text
tn = "034991935048"
tn.replace(/^55/, '') = "034991935048"  (nao comeca com 55, nada muda)
n = "553491935048"
n.includes("034991935048") = FALSE  (nao contem essa sequencia)
```

### Solucao

Ajustar a normalizacao do numero de teste na linha 1830 do webhook para tambem remover o zero inicial (padrao brasileiro de discagem local), alem do prefixo `55`.

**Arquivo: `supabase/functions/wapi-webhook/index.ts`**

Alterar a linha 1830 de:
```js
const isTest = tn && n.includes(tn.replace(/^55/, ''));
```
Para:
```js
const isTest = tn && n.includes(tn.replace(/^55/, '').replace(/^0+/, ''));
```

Isso faz `"034991935048"` virar `"34991935048"`, e a comparacao `"553491935048".includes("34991935048")` retorna `true`.

Tambem aplicar a mesma correcao na funcao `shouldSkipTestMode` do `follow-up-check`, que usa logica similar, para manter consistencia.

**Arquivo: `supabase/functions/follow-up-check/index.ts`**

Verificar e aplicar a mesma normalizacao na comparacao de numero de teste.

### O que NAO muda
- A logica de `botSettingsAllow` ja esta correta (permite test mode sem bot global)
- O fluxo de conversa continua igual
- Nenhuma tabela precisa ser alterada
- O numero salvo no banco nao precisa ser editado

