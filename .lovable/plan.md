
# Corrigir o Chatbot para ser Multi-Empresa

## Problema

O chatbot que aparece na LP do Planeta Divertido mostra "Castelo da Diversão", o logo do Castelo, e pergunta sobre unidades Manchester/Trujillo. Tudo isso e hardcoded do `campaignConfig` e do `logo-castelo.png`.

## Solucao

Passar os dados da empresa (nome, logo, unidades) como props do `DynamicLandingPage` para o `LeadChatbot`, para que ele se adapte automaticamente a qualquer buffet.

## O Que Muda

### 1. Props do LeadChatbot (`LeadChatbot.tsx`)

Adicionar novas props opcionais para dados dinâmicos:

```text
LeadChatbotProps {
  isOpen, onClose, companyId,
  + companyName?: string       // "Planeta Divertido"
  + companyLogo?: string       // URL do logo
  + companyUnits?: string[]    // ["Planeta Divertido"] ou vazio
  + companyWhatsApp?: string   // telefone da empresa
}
```

### 2. Logica Adaptativa no Chatbot

- **Header**: usar `companyName` e `companyLogo` quando fornecidos, senao fallback para Castelo
- **Passo de unidade**: se empresa tem apenas 1 unidade (ou nenhuma), PULAR o passo de selecao de unidade e auto-selecionar
- **Meses/Promo**: quando nao e o Castelo, nao mostrar mensagem de promo (usar meses simples)
- **Guest options**: manter as mesmas opcoes para todos
- **WhatsApp final**: quando `companyWhatsApp` fornecido, mostrar apenas 1 botao com o telefone da empresa
- **Campaign**: usar `companyId` passado como prop (ja funciona) e gerar campaign_id generico ("lp-lead") quando nao e o Castelo

### 3. DynamicLandingPage.tsx

Passar os dados da empresa para o chatbot:

```text
<LeadChatbot
  isOpen={isChatOpen}
  onClose={closeChat}
  companyId={data.company_id}
  companyName={data.company_name}        // NOVO
  companyLogo={data.company_logo}        // NOVO
/>
```

As unidades serao buscadas do banco (`wapi_instances` da empresa) dentro do proprio chatbot quando abrir.

### 4. Fluxo do Chatbot para Planeta Divertido

Como o Planeta Divertido tem apenas 1 unidade e nao tem promocao ativa:

```text
Bot: "Oi! Vou te ajudar a montar seu orcamento!"
Bot: "Para qual mes voce pretende realizar a festa?"
  -> [Fevereiro] [Marco] [Abril] ... [Dezembro]
Bot: "Para qual dia de {mes}?"
  -> Calendario com dias
Bot: "Para quantas pessoas sera a festa?"
  -> [50] [60] [70] [80] [90] [100]
Bot: "Agora preciso dos seus dados..."
  -> Nome -> WhatsApp -> Pronto!
```

Sem perguntar unidade. Sem mensagem de promo. Sem links de Manchester/Trujillo.

### 5. Tela Final (Completo)

Em vez de mostrar 2 botoes de WhatsApp (Manchester/Trujillo), mostrar apenas 1 botao com o telefone da empresa (11987818460 para Planeta Divertido), ou nenhum se nao houver telefone configurado.

## Arquivos Modificados

1. **`src/components/landing/LeadChatbot.tsx`** -- refatorar para aceitar props dinamicos e adaptar fluxo
2. **`src/pages/DynamicLandingPage.tsx`** -- passar `companyName` e `companyLogo` ao chatbot

## O Que NAO Muda

- A LP do Castelo da Diversao (`/` e `LandingPage.tsx`) continua usando o chatbot com `campaignConfig` normalmente
- O `campaignConfig.ts` nao muda
- Nenhuma migration de banco necessaria
- A edge function `submit-lead` ja aceita qualquer `company_id`

## Detalhes Tecnicos

- O chatbot detecta se e modo "dinamico" pela presenca de `companyName` nas props
- Quando `companyName` esta presente, ignora `campaignConfig` e usa os dados da prop
- Busca as unidades da empresa via `wapi_instances` para decidir se mostra seletor de unidade
- O telefone do WhatsApp sera buscado da `wapi_instances.phone_number` da empresa
- Fallback para o comportamento atual (Castelo) quando nao ha props dinamicos
