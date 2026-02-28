

## Mensagem de Aprovacao Editavel + Bot Desligado + Conversa Freelancer/Equipe

### O que sera feito

Quando o buffet clicar em "Aprovar" um freelancer, o sistema vai:

1. Aprovar no banco (como ja faz hoje)
2. Enviar uma mensagem personalizada via WhatsApp para o freelancer
3. Marcar a conversa como **Freelancer + Equipe** (aparece nos dois filtros)
4. Qualificar o lead como **Trabalhe Conosco**
5. Desligar o bot para essa conversa (freelancer responde, bot nao interfere)

A mensagem podera ser editada nas **Configuracoes > WhatsApp > Conteudo**, com um card dedicado abaixo das tabs de Templates e Materiais.

### Mensagem padrao

```
Ola {nome}!

Seu cadastro na nossa equipe foi aprovado!

Voce ja esta disponivel para ser escalado(a) para nossos eventos. Fique atento(a) que entraremos em contato quando precisarmos de voce!

Obrigado por fazer parte do time!
```

A variavel `{nome}` sera substituida automaticamente pelo nome do freelancer.

### Detalhes tecnicos

**Arquivo novo: `src/components/whatsapp/settings/FreelancerApprovalMessageCard.tsx`**
- Seguindo o padrao exato do `PartyBotMessagesCard.tsx`
- Carrega `companies.settings.freelancer_approval_message` ao montar
- Textarea para editar, indicador da variavel `{nome}`, botoes Salvar e Restaurar padrao
- Exporta `DEFAULT_FREELANCER_APPROVAL_MESSAGE` para reuso

**Arquivo: `src/components/whatsapp/settings/ContentSection.tsx`**
- Adicionar o `FreelancerApprovalMessageCard` abaixo das tabs existentes (fora do `Tabs`, como um card extra)

**Arquivo: `src/pages/FreelancerManager.tsx`**
- Alterar `handleApproval` para receber o objeto `response` completo (hoje recebe so o `id`)
- Quando `status === "aprovado"`:
  1. Buscar template: `companies.settings.freelancer_approval_message` (fallback para default)
  2. Extrair telefone: `answers.find(a => a.questionId === "telefone")?.value`
  3. Buscar instancia conectada: `wapi_instances` com `status = "connected"` e `company_id`
  4. Enviar via `wapi-send` (action: `send-text`, SEM `lpMode`)
  5. Buscar/atualizar conversa em `wapi_conversations` pelo telefone: `is_freelancer: true`, `is_equipe: true`, `bot_enabled: false`, `bot_step: null`
  6. Se houver `lead_id` vinculado na conversa, atualizar `campaign_leads.status` para `trabalhe_conosco`
- Atualizar chamadas no JSX: `onClick={() => handleApproval(r, "aprovado")}` passando o response inteiro
- Tratamento gracioso: sem telefone ou sem WhatsApp conectado = aprovacao OK, apenas sem mensagem

**Nenhuma alteracao no banco de dados** -- tudo usa campos ja existentes (`settings` JSONB, `is_freelancer`, `is_equipe`, `bot_enabled`, `bot_step`).

