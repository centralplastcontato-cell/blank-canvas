

# Mensagem personalizada no WhatsApp para leads redirecionados

## O que muda

Quando o lead seleciona uma opcao acima do limite (ex: "+ DE 90 PESSOAS") e aceita o redirecionamento, a mensagem enviada no WhatsApp sera diferente da mensagem padrao.

**Hoje:** Todos os leads recebem a mesma mensagem com opcoes "1-Receber orcamento / 2-Falar com atendente", mesmo os redirecionados.

**Depois:** Leads redirecionados receberao uma mensagem informando que seus dados foram encaminhados para o buffet parceiro.

## Mensagem para leads redirecionados

```
Ola! 👋✨

Vim pelo site do *Planeta Divertido* e gostaria de saber mais!

📋 *Meus dados:*
👤 Nome: VICTOR
📍 Unidade: Planeta Divertido
📅 Data: 21/Maio
👥 Convidados: + DE 90 PESSOAS

Nossa capacidade maxima e de 90 convidados 😊
Seus dados foram encaminhados para o *Buffet Mega Magic*, proximo de nos, que entrara em contato em breve para envio de orcamento sem compromisso!

Obrigado pelo interesse! 💜
```

## Detalhes Tecnicos

### Arquivo: `src/components/landing/LeadChatbot.tsx`

**1. Alterar a assinatura da funcao `sendWelcomeMessage` (linha 364):**

Adicionar parametro opcional `redirectInfo`:

```typescript
const sendWelcomeMessage = async (
  phone: string,
  unit: string,
  leadInfo: LeadData,
  redirectInfo?: { partnerName: string; limit: number }
) => {
```

**2. Montar a mensagem condicional dentro da funcao (linha 370):**

```typescript
const message = redirectInfo
  ? `Ola! 👋✨\n\nVim pelo site do *${displayName}* e gostaria de saber mais!\n\n📋 *Meus dados:*\n👤 Nome: ${leadInfo.name || ''}\n📍 Unidade: ${unit}\n📅 Data: ${leadInfo.dayOfMonth || ''}/${leadInfo.month || ''}\n👥 Convidados: ${leadInfo.guests || ''}\n\nNossa capacidade maxima e de ${redirectInfo.limit} convidados 😊\nSeus dados foram encaminhados para o *${redirectInfo.partnerName}*, proximo de nos, que entrara em contato em breve para envio de orcamento sem compromisso!\n\nObrigado pelo interesse! 💜`
  : `Ola! 👋🏼✨\n\nVim pelo site...`; // mensagem atual mantida
```

**3. Passar `redirectInfo` na chamada (linhas 444-453):**

Quando `isRedirected === true`, passar os dados do buffet parceiro:

```typescript
const redirectInfo = isRedirected ? {
  partnerName: lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro',
  limit: lpBotConfig?.guest_limit || 0
} : undefined;

sendWelcomeMessage(whatsappValue, leadData.unit, finalLeadData, redirectInfo)
```

Nenhuma mudanca no backend -- tudo acontece no front, que ja controla o envio via `wapi-send`.

