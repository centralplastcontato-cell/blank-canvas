

## Correcao: Lead da Jessica e visibilidade de "Trabalhe Conosco" no CRM

### Problema 1: Card da Jessica nao aparece

A conversa da Jessica Yolanda foi processada pelo **Flow Builder** (antes da correcao que fizemos). O Flow Builder marcou `bot_step = 'flow_complete'` mas **nao criou nenhum lead** na tabela `campaign_leads`, entao `lead_id` ficou `null`.

Sem um lead vinculado, o card dela nao aparece corretamente na interface do WhatsApp e nao existe no CRM.

**Solucao**: Criar o lead manualmente no banco e vincular a conversa:

```sql
-- 1. Criar lead para Jessica
INSERT INTO campaign_leads (name, whatsapp, unit, campaign_id, campaign_name, status, company_id)
VALUES ('Jessica Yolanda', '5515996382612', 'Trabalhe Conosco', 'whatsapp-bot-rh', 'WhatsApp (Bot) - RH', 'novo', 'a0000000-0000-0000-0000-000000000001')
RETURNING id;

-- 2. Vincular o lead a conversa (usar o ID retornado acima)
UPDATE wapi_conversations
SET lead_id = '<ID_RETORNADO>', bot_step = 'work_interest'
WHERE id = '6bb469cb-8e74-4599-bdda-37ffa892e246';
```

### Problema 2: Card "Trabalhe no Castelo" nao aparece no CRM

A unidade "Trabalhe Conosco" ja existe na tabela `company_units` e o lead do Victor (o teste que funcionou) ja esta la com `unit = 'Trabalhe Conosco'`. O Kanban do CRM filtra leads por unidade usando as abas de `UnitKanbanTabs.tsx`.

O card **deveria aparecer** na aba "Trabalhe Conosco" do Kanban. Se nao esta aparecendo, pode ser por permissao do usuario logado (o usuario precisa ter acesso a unidade "Trabalhe Conosco" nas permissoes ou ser admin/gestor com visualizacao total).

Verificaremos as permissoes e, se necessario, ajustaremos o acesso.

### Resumo das acoes

1. **Migracao SQL**: Criar lead da Jessica e vincular a conversa
2. **Verificacao**: Confirmar que leads com `unit = 'Trabalhe Conosco'` aparecem na aba correta do CRM
3. **Permissoes**: Verificar se o usuario logado tem acesso a unidade "Trabalhe Conosco"

### Impacto

- Apenas correcao de dados (1 INSERT + 1 UPDATE)
- Nenhuma alteracao de codigo necessaria
- A Jessica passara a aparecer tanto no chat quanto no CRM
