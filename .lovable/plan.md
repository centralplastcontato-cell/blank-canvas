

## Adicionar Campo Editável para Mensagem de WhatsApp do Lead (pós-LP)

### Contexto
Quando um lead finaliza o chatbot da Landing Page, o sistema envia automaticamente uma mensagem no WhatsApp com os dados coletados (nome, unidade, data, convidados). Essa mensagem está fixa no código e não pode ser editada pela interface.

### Solução
Adicionar um campo editável nas configurações do Bot LP (`LPBotSection.tsx`) para personalizar o template dessa mensagem, e usar esse template no `LeadChatbot.tsx` ao enviar.

### Alterações

**1. Arquivo: `src/components/whatsapp/settings/LPBotSection.tsx`**
- Adicionar novo campo "Mensagem de WhatsApp (pós-formulário)" na seção "Mensagens Principais"
- O campo será um `Textarea` para o template da mensagem
- Incluir variáveis disponíveis como dica: `{nome}`, `{unidade}`, `{data}`, `{convidados}`, `{empresa}`
- Salvar no campo `whatsapp_welcome_template` da tabela `lp_bot_settings`

**2. Arquivo: `src/components/landing/LeadChatbot.tsx`**
- Receber o template via `lpBotConfig`
- Se existir template customizado, substituir as variáveis pelos dados do lead
- Se não existir, usar a mensagem padrão atual (hardcoded)
- Aplicar tanto no `sendWelcomeMessage` quanto no `buildWhatsAppMessage`

**3. Banco de dados**
- Será necessário adicionar a coluna `whatsapp_welcome_template` (text, nullable) na tabela `lp_bot_settings` via migration

**4. Arquivo: `src/pages/DynamicLandingPage.tsx`**
- Incluir o novo campo `whatsapp_welcome_template` ao carregar `lp_bot_settings` e repassar ao `LeadChatbot`

### Template Padrão (referência)
```text
Olá! 👋🏼✨

Vim pelo site do *{empresa}* e gostaria de saber mais!

📋 *Meus dados:*
👤 Nome: {nome}
📍 Unidade: {unidade}
📅 Data: {data}
👥 Convidados: {convidados}

Vou dar continuidade no seu atendimento!! 🚀

Escolha a opção que mais te agrada 👇

1️⃣ - 📩 Receber agora meu orçamento
2️⃣ - 💬 Falar com um atendente
```

### Resultado
- Administradores podem personalizar a mensagem de WhatsApp enviada após o lead preencher o chatbot da LP
- Variáveis são substituídas automaticamente pelos dados do lead
- Empresas sem template customizado continuam usando a mensagem padrão atual

