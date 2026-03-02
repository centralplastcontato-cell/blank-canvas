
## Simplificar fluxo de audio para funcionar como o WhatsApp

### Problema atual
O fluxo de gravacao tem 3 passos confusos:
1. Toca no microfone → comeca a gravar
2. Toca no botao quadrado (stop) → para a gravacao e mostra "Gravacao pronta"
3. Toca no botao enviar → finalmente envia

No WhatsApp real, o fluxo e mais direto:
1. Toca no microfone → comeca a gravar, mostra timer
2. Toca no botao enviar (verde) → para e envia imediatamente
3. Toca no X → cancela

### Solucao

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**

Simplificar a UI de gravacao em ambos os layouts (desktop e mobile):

1. **Remover estado intermediario "gravacao pronta"**: Quando o usuario clicar em enviar durante a gravacao, o sistema para a gravacao e envia automaticamente em sequencia, sem mostrar o estado intermediario.

2. **Simplificar botoes durante gravacao**: Mostrar apenas:
   - Indicador vermelho pulsante + timer (igual ao atual)
   - Botao X para cancelar
   - Botao Enviar (azul) que para + envia de uma vez

3. **Remover botoes de pause/resume e stop**: Esses botoes nao existem no WhatsApp real e confundem o usuario.

4. **Criar funcao `stopAndSendAudio`**: Nova funcao que chama `stopRecording()` e aguarda o `audioBlob` ficar disponivel via um `useEffect`, disparando o envio automaticamente.

### UI durante gravacao (antes vs depois)

```text
ANTES:
[timer pulsando] [X cancelar] [pause/play] [stop quadrado]
...depois de parar...
[timer] "Gravacao pronta" [X] [enviar]

DEPOIS:
[bolinha vermelha pulsando] [timer] [X cancelar] [Enviar azul]
```

### Detalhes tecnicos

- Adicionar estado `pendingSendAudio` (boolean) que e ativado quando o usuario clica em enviar durante a gravacao
- `useEffect` monitora `audioBlob` + `pendingSendAudio`: quando ambos estao prontos, chama `sendRecordedAudio()` e reseta o flag
- A funcao `handleStopAndSend` seta `pendingSendAudio = true` e chama `stopRecording()`
- Remover botoes de Pause/Resume e Stop separado
- Aplicar nos dois layouts: desktop (linhas ~4314-4379) e mobile (precisa adicionar o mesmo bloco de recording UI que so existe no desktop atualmente)

### Mobile - Adicionar UI de gravacao
Atualmente o mobile NAO mostra a UI de gravacao (timer, cancelar, etc) - so mostra o form normal. Precisa adicionar o mesmo bloco condicional `isRecording ? ... : form` no layout mobile (ao redor da linha 5260).

Apenas o arquivo `WhatsAppChat.tsx` sera modificado. Sem dependencias novas.
