

# Corrigir: Bot envia apenas 1 foto ao inves de todas

## Problema

A funcao `sendImage` no `wapi-webhook/index.ts` (linhas 2506-2535) converte cada imagem para base64 em memoria antes de enviar para a W-API. Com 10 fotos do Planeta Divertido, a Edge Function estoura o limite de memoria/tempo e trava apos enviar apenas a primeira foto.

Evidencia no banco de dados: apenas 1 mensagem do tipo "image" foi registrada (as 22:59:45), enquanto a colecao tem 10 fotos. Nenhum video ou PDF foi enviado depois, confirmando que a funcao travou.

## Causa raiz

```text
// Codigo atual - linha 2506-2535
const sendImage = async (url: string, caption: string) => {
  const imgRes = await fetch(url);        // Download inteiro na memoria
  const buf = await imgRes.arrayBuffer(); // Buffer completo
  // ... converte byte a byte para base64 ...
  const base64 = `data:${ct};base64,${btoa(bin)}`;  // Duplica na memoria
  // envia base64 para W-API
};
```

Cada foto ocupa ~2-5MB como base64. Com 10 fotos processadas sequencialmente, a Edge Function ultrapassa o limite de ~150MB de memoria ou o timeout de 150 segundos.

## Solucao

Alterar `sendImage` para enviar a URL diretamente para a W-API (assim como a funcao `wapi-send` ja faz com sucesso na linha 299-301). A W-API aceita tanto base64 quanto URL no campo `image`.

### Alteracao no arquivo `supabase/functions/wapi-webhook/index.ts`

**Substituir a funcao `sendImage` (linhas 2506-2535):**

```text
// ANTES: download + base64 (pesado, causa OOM)
const sendImage = async (url: string, caption: string) => {
  const imgRes = await fetch(url);
  const buf = await imgRes.arrayBuffer();
  // ... conversao base64 ...
};

// DEPOIS: envia URL diretamente (leve, sem download)
const sendImage = async (url: string, caption: string) => {
  try {
    const res = await fetch(
      `${WAPI_BASE_URL}/message/send-image?instanceId=${instance.instance_id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${instance.instance_token}`,
        },
        body: JSON.stringify({ phone, image: url, caption }),
      }
    );
    if (!res.ok) return null;
    const r = await res.json();
    return r.messageId || null;
  } catch (e) {
    console.error('[Bot Materials] Error sending image:', e);
    return null;
  }
};
```

### Aumento do delay entre fotos

Tambem aumentar o delay entre fotos de 2s para 3s para respeitar os limites do plano W-API Lite (conforme padrao ja usado no frontend):

```text
// Linha 2623: mudar de 2000 para 3000
if (i < photos.length - 1) {
  await new Promise(r => setTimeout(r, 3000));
}
```

## Resultado esperado

- Todas as 10 fotos da colecao serao enviadas com sucesso
- O video de apresentacao sera enviado apos as fotos
- Os PDFs (IMAGEM 1, IMAGEM 2, TABELA DE PRECOS) serao enviados apos o video
- Consumo de memoria reduzido drasticamente (de ~50MB por foto para ~0)
- Tempo de execucao reduzido (sem download de arquivos)

## Impacto

- Corrige o Planeta Divertido e qualquer outra instancia com colecoes de fotos
- Nao afeta o Castelo da Diversao (usa o mesmo codigo)
- Nenhuma alteracao no banco de dados necessaria
- Apenas 1 arquivo alterado + deploy da edge function

