

## Corrigir mensagem duplicada no WhatsApp e tornar mensagem de conclusão editável

### Problema identificado

Analisando o código e os screenshots, identifiquei **dois problemas**:

1. **Mensagem do WhatsApp** (linha 372-373): O código foi corrigido corretamente na ultima alteracao. O caminho com `customMessage` (linha 372) NAO inclui o texto extra "Seus dados foram encaminhados...". Porem, o texto extra ainda aparece na mensagem. Isso pode ser porque:
   - O build anterior ainda estava em cache no navegador do usuario
   - OU a variavel `customMessage` esta chegando como `null`/vazio e caindo no fallback (linha 373) que TEM o texto hardcoded

   Para garantir que funcione: vou adicionar uma verificacao mais robusta e tambem remover o texto redundante do fallback.

2. **Mensagem de conclusao no chat da LP** (linha 465-466): Quando o lead e redirecionado, o chatbot mostra no chat: "Seus dados foram encaminhados para o {parceiro}. Eles entrarão em contato em breve!" -- este texto e 100% hardcoded e NAO pode ser editado nas configuracoes. Precisa usar a mensagem personalizada tambem.

### Solucao

**Arquivo: `src/components/landing/LeadChatbot.tsx`**

**1. Garantir que customMessage nunca caia no fallback errado (linhas 449-453):**

Mudar a logica para verificar se a string tem conteudo real, nao apenas se nao e null:

```typescript
const redirectInfo = isRedirected ? {
  partnerName: lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro',
  limit: lpBotConfig?.guest_limit || 0,
  customMessage: (lpBotConfig?.guest_limit_message && lpBotConfig.guest_limit_message.trim()) || null,
} : undefined;
```

**2. Simplificar o fallback da mensagem WhatsApp (linhas 370-374):**

Remover o texto "Seus dados foram encaminhados" do fallback tambem, deixando apenas o limite:

```typescript
const redirectText = redirectInfo?.customMessage
  || `Nossa capacidade máxima é de ${redirectInfo?.limit} convidados.`;

const message = redirectInfo
  ? `Olá! ...dados...\n\n${redirectText}\n\nObrigado pelo interesse! 💜`
  : `Olá! ...dados...\n\nVou dar continuidade...`;
```

**3. Tornar a mensagem de conclusao editavel (linhas 465-466):**

Usar `guest_limit_message` tambem para a mensagem de conclusao no chat:

```typescript
const completionMessage = isRedirected
  ? (lpBotConfig?.guest_limit_message
    ? `${lpBotConfig.guest_limit_message}\n\nObrigado pelo interesse! 💜`
    : `Prontinho! 🎉\n\nSeus dados foram encaminhados para o ${lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro'}. Eles entrarão em contato em breve!\n\nObrigado pelo interesse! 💜`)
  : isDynamic ? ...
```

### Resultado esperado
- A mensagem no WhatsApp mostra SOMENTE o texto configurado em Bot LP, sem nenhuma frase extra hardcoded
- A mensagem de conclusao no chat da LP tambem reflete o texto personalizado
- O fallback (sem mensagem customizada) funciona com texto simples e limpo
- Verificacao robusta garante que strings vazias nao caiam no fallback errado

