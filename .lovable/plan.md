

## Botao de Enviar e Microfone lado a lado (estilo WhatsApp)

### Problema
Atualmente, o botao de enviar texto e o botao de gravar audio ocupam o mesmo espaco -- apenas um aparece por vez (se ha texto digitado, mostra Enviar; se nao, mostra Microfone). O usuario quer que ambos fiquem visiveis lado a lado, como no WhatsApp nativo.

### Solucao
Mostrar sempre os dois botoes: o botao de enviar (habilitado apenas quando ha texto) e o botao de microfone, lado a lado a direita do campo de texto.

### Mudancas

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**

Substituir a logica ternaria `newMessage.trim() ? <Send> : <Mic>` por ambos os botoes renderizados simultaneamente, em dois locais:

1. **Desktop (linha ~4483-4503)**: Remover o ternario e renderizar ambos:
   - Botao Send: sempre visivel, desabilitado quando nao ha texto ou esta enviando
   - Botao Mic: sempre visivel, desabilitado quando ha texto digitado ou sem permissao

2. **Mobile (linha ~5347-5362)**: Mesma alteracao para manter consistencia.

### Resultado esperado
```text
[  Campo de texto...  ] [Enviar] [Mic]
```
- Com texto digitado: Enviar ativo (azul), Mic desabilitado (cinza)
- Sem texto: Enviar desabilitado, Mic ativo
- Ambos sempre visiveis

