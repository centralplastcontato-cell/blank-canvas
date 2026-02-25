
## Atualizar configuração da Aventura Kids no banco de dados

A empresa Aventura Kids (ID: `eb1776f0-142e-41db-9134-7d352d02c5bd`) precisa ter seu registro atualizado para ficar igual aos outros clientes.

### O que sera feito

Um `UPDATE` na tabela `companies` para definir:

**1. custom_domain** = `aventurakids.online`

**2. settings** com a mesma estrutura do Castelo da Diversao:
- **enabled_modules**: todos habilitados (whatsapp, crm, dashboard, sales_materials, config, automations, data_import, advanced, messages, comercial_b2b, flow_builder, inteligencia, agenda, operacoes)
- **party_control_modules**: todos habilitados (checklist, staff, maintenance, monitoring, attendance, info, prefesta, cardapio, avaliacao)
- **ai_enabled**: true

### Resultado esperado

- O card no Hub vai mostrar `aventurakids.online` em vez de "Sem dominio"
- Os links de Login e Onboarding vao funcionar corretamente
- O admin da Aventura Kids tera acesso a todos os modulos do sistema (CRM, WhatsApp, Agenda, Inteligencia, etc.)

### Detalhes Tecnicos

Sera executado via ferramenta de insercao/atualizacao de dados (nao e migracao de schema):

```text
UPDATE companies
SET
  custom_domain = 'aventurakids.online',
  settings = {
    "enabled_modules": {
      "whatsapp": true, "crm": true, "dashboard": true,
      "sales_materials": true, "config": true, "automations": true,
      "data_import": true, "advanced": true, "messages": true,
      "comercial_b2b": true, "flow_builder": true, "inteligencia": true,
      "agenda": true, "operacoes": true
    },
    "party_control_modules": {
      "checklist": true, "staff": true, "maintenance": true,
      "monitoring": true, "attendance": true, "info": true,
      "prefesta": true, "cardapio": true, "avaliacao": true
    },
    "ai_enabled": true
  }
WHERE id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';
```

Nenhuma alteracao de codigo e necessaria -- apenas dados no banco.
