

## Plan: Corrigir envio de áudio pela plataforma

### Problemas identificados

Após varredura completa do fluxo (gravação → upload → edge function → W-API → reprodução), encontrei **3 problemas raiz**:

1. **MIME type incorreto (causa principal de não abrir no celular)**: O áudio é gravado como `audio/webm;codecs=opus` pelo navegador, mas na edge function é rotulado como `data:audio/ogg;base64,...`. WebM ≠ OGG — são containers diferentes. O WhatsApp espera OGG Opus para mensagens de voz. Resultado: o áudio chega mas não reproduz corretamente em alguns dispositivos.

2. **Round-trip desnecessário e frágil**: O frontend faz upload do blob para o Supabase Storage → gera URL assinada → envia URL para a edge function → edge function baixa o arquivo de volta → converte para base64 → envia para W-API. Esse ciclo introduz pontos de falha (download pode falhar, timeout, arquivo grande).

3. **Conversão base64 potencialmente instável**: O `String.fromCharCode.apply(null, Array.from(chunk))` com chunks de 32KB pode falhar em alguns runtimes com áudios grandes (stack overflow).

### Solução

**Enviar o base64 diretamente do frontend**, eliminando o round-trip pelo Storage. Fazer upload ao Storage apenas para persistência no histórico (em paralelo, sem bloquear o envio).

#### Arquivo: `src/components/whatsapp/WhatsAppChat.tsx` — `sendRecordedAudio()`

1. Converter o `audioBlob` para base64 no frontend (com chunked conversion segura)
2. Enviar o base64 diretamente para a edge function (`base64` param em vez de `mediaUrl`)
3. Em paralelo, fazer upload ao Storage para ter a `media_url` no histórico
4. Atualizar a mensagem otimista com a URL do storage depois

#### Arquivo: `supabase/functions/wapi-send/index.ts` — case `send-audio`

1. Quando receber `base64`, detectar o MIME type real do blob (webm vs ogg) e usar o prefixo correto
2. Melhorar a conversão base64 do fallback `mediaUrl` usando loop seguro (sem `String.fromCharCode.apply`)
3. Salvar a `media_url` no banco apenas se disponível (o frontend enviará em seguida)

#### Arquivo: `src/hooks/useAudioRecorder.ts`

- Sem alterações necessárias — o hook funciona corretamente.

### Resultado esperado

- Áudio enviado de forma mais rápida e confiável (sem round-trip)
- Reprodução correta no celular (MIME type correto)
- Fallback mantido para `mediaUrl` com conversão segura
- Histórico preservado com URL do Storage

