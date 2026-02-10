
## Adicionar opção "Trabalhe no Castelo" ao bot do WhatsApp

### Resumo

Adicionar a terceira opção ao menu do bot ("Trabalhe no Castelo") com uma resposta automática e envio do lead para uma aba exclusiva no CRM. O lead que escolher essa opção sera tratado de forma semelhante ao "Já sou cliente" -- o bot encerra a conversa, envia uma mensagem personalizada e registra o contato no CRM com uma unidade especial.

### Sugestao de resposta para a opcao 3

> "Que legal que você quer fazer parte do nosso time! 🏰✨
>
> Envie seu currículo aqui nesta conversa e nossa equipe de RH vai analisar!
>
> Obrigado pelo interesse! 👑"

### O que muda

**1. Nova opcao no menu do bot (wapi-webhook)**
- Atualizar `TIPO_OPTIONS` de 2 para 3 opcoes:
  - 1 - Já sou cliente
  - 2 - Quero um orçamento
  - 3 - Trabalhe no Castelo
- Atualizar `DEFAULT_QUESTIONS.tipo` para incluir a opcao 3 no texto da pergunta

**2. Tratamento da opcao 3 no fluxo do bot (wapi-webhook)**
- Quando o lead responder "3", o bot:
  - Envia a mensagem de resposta (configuravel via `settings.work_here_response` ou o padrao sugerido acima)
  - Cria um lead no CRM com `unit = "Trabalhe Conosco"` e `status = "novo"` e `campaign_name = "WhatsApp (Bot) - RH"`
  - Desativa o bot para essa conversa (`bot_step: "work_interest"`, `bot_enabled: false`)
  - Cria notificacoes para os admins

**3. Nova unidade "Trabalhe Conosco" no CRM**
- Criar uma nova unidade na tabela `company_units` com slug `trabalhe-conosco`
- Isso automaticamente gera uma nova aba no Kanban do CRM
- Leads com `unit = "Trabalhe Conosco"` aparecerao nessa aba exclusiva

**4. Coluna de configuracao no bot_settings (opcional)**
- Adicionar coluna `work_here_response` na tabela `wapi_bot_settings` para permitir personalizacao da mensagem

---

### Detalhes tecnicos

**Edge Function `wapi-webhook/index.ts`:**

```text
TIPO_OPTIONS atualizado:
  { num: 1, value: 'Já sou cliente' }
  { num: 2, value: 'Quero um orçamento' }
  { num: 3, value: 'Trabalhe no Castelo' }
```

No bloco de tratamento do step `tipo` (apos a validacao):
- Opcao 1: fluxo atual (transferido, sem lead)
- Opcao 2: fluxo atual (continua qualificacao)
- Opcao 3 (novo): encerra bot, cria lead com unidade "Trabalhe Conosco", envia resposta

**Migracao SQL:**
- Inserir unidade "Trabalhe Conosco" na tabela `company_units` para a empresa Castelo
- Adicionar coluna `work_here_response` em `wapi_bot_settings`

**Arquivos modificados:**
- `supabase/functions/wapi-webhook/index.ts` -- nova opcao e tratamento
- Nova migracao SQL -- unidade + coluna de configuracao
