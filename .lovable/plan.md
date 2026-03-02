

## Corrigir envio de audio - W-API rejeita URL sem extensao .mp3/.ogg

### Problema
O log do Edge Function mostra o erro exato:
```
send-audio failed: A URL do áudio deve ser nos formatos .mp3 ou .ogg
```

A W-API valida a extensao da URL e rejeita URLs assinadas do Supabase (que terminam com parametros de query e tem extensao `.webm`). Enviar por URL direta nao funciona para audio nesta API.

### Solucao

**Arquivo: `supabase/functions/wapi-send/index.ts`**

Modificar o case `send-audio` para SEMPRE converter o audio para base64 quando receber uma `mediaUrl`, ao inves de tentar enviar a URL diretamente. O fluxo sera:

1. Recebe `mediaUrl` (URL assinada do Supabase Storage)
2. Faz `fetch` da URL para obter o conteudo binario
3. Converte para base64 com prefixo `data:audio/ogg;base64,...`
4. Envia para a W-API como base64

Isso segue o mesmo padrao que ja funciona para outros tipos de midia quando a URL nao e aceita diretamente.

### Codigo

```text
case 'send-audio': {
  const { base64: audioBase64, mediaUrl: audioMediaUrl } = body;
  
  let audioPayload: Record<string, unknown> = { phone };

  if (audioBase64) {
    // Se ja veio base64, usar diretamente (com prefixo)
    let finalAudio = audioBase64;
    if (!finalAudio.startsWith('data:')) {
      finalAudio = `data:audio/ogg;base64,${finalAudio}`;
    }
    audioPayload.audio = finalAudio;
  } else if (audioMediaUrl) {
    // Baixar da URL e converter para base64 (W-API nao aceita URLs sem extensao .mp3/.ogg)
    console.log('send-audio: fetching and converting to base64:', audioMediaUrl.substring(0, 80));
    const audioRes = await fetch(audioMediaUrl);
    if (!audioRes.ok) throw new Error('Falha ao baixar audio: ' + audioRes.status);
    const buf = await audioRes.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 32768) {
      const chunk = bytes.subarray(i, Math.min(i + 32768, bytes.length));
      bin += String.fromCharCode.apply(null, Array.from(chunk));
    }
    audioPayload.audio = `data:audio/ogg;base64,${btoa(bin)}`;
  } else {
    return error;
  }
  // ... resto igual (enviar para W-API, salvar mensagem)
}
```

### Sobre o microfone pedindo permissao

O navegador SEMPRE pede permissao para acessar o microfone na primeira vez -- isso e uma restricao de seguranca do browser e nao pode ser removida. No WhatsApp nativo isso nao acontece porque e um app instalado. Apos conceder a permissao uma vez, o browser nao pede novamente (ate limpar dados do site).

### Resumo
- Uma unica mudanca no `wapi-send/index.ts`: remover o caminho de "enviar por URL" para audio e sempre converter para base64
- Nenhuma mudanca no frontend
