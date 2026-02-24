

## Corrigir correspondencia entre configuracoes e mensagens exibidas

### Problema
As mensagens configuradas no Bot LP nao estao correspondendo ao que aparece no WhatsApp. O screenshot mostra que a mensagem do WhatsApp contem texto extra hardcoded ("Seus dados foram encaminhados para o Buffet Mega Magic...") alem do texto personalizado configurado.

### Causa raiz
Na linha 371-372 do `LeadChatbot.tsx`, o fallback do `redirectText` ainda contem o texto longo hardcoded. Se por qualquer motivo o `customMessage` falhar (null, undefined, string vazia), o sistema usa esse fallback com texto duplicado. Alem disso, o acesso `redirectInfo.customMessage` sem optional chaining pode causar erro quando `redirectInfo` e undefined.

### Solucao

**Arquivo: `src/components/landing/LeadChatbot.tsx`**

**1. Corrigir acesso seguro e simplificar fallback (linhas 371-372):**

Antes:
```text
const redirectText = redirectInfo.customMessage
  || `Nossa capacidade maxima e de ${redirectInfo.limit} convidados. Seus dados foram encaminhados para o *${redirectInfo.partnerName}*...`;
```

Depois:
```text
const redirectText = (redirectInfo?.customMessage && redirectInfo.customMessage.trim())
  || `Nossa capacidade maxima e de ${redirectInfo?.limit || 0} convidados.`;
```

Mudancas:
- Adiciona optional chaining (`?.`) para evitar erro
- Adiciona `.trim()` para garantir que strings vazias nao passem
- Remove TODA a frase "Seus dados foram encaminhados..." do fallback -- fica so o texto minimo do limite

**2. Garantir que a mensagem de conclusao usa o campo correto (linhas 467-470):**

Verificar que `redirect_completion_message` esta sendo priorizado corretamente. O codigo atual ja esta correto, mas confirmar que o campo chega via `lpBotConfig`.

### Resultado esperado
- **WhatsApp**: Mostra SOMENTE o texto configurado em "Mensagem de redirecionamento", sem nenhuma frase extra
- **Chat da LP**: Mostra o texto configurado em "Mensagem de conclusao (chat da LP)"
- **Fallback**: Se nenhuma mensagem estiver configurada, mostra apenas "Nossa capacidade maxima e de X convidados." -- limpo e sem duplicacao

