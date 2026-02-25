

## Adicionar Toggle "Rotação Automática de Meses" nas Configurações do Bot WhatsApp

### Problema
O toggle para ativar a rotação automática de meses (apagar mês anterior e adicionar novo mês no final) só aparece nas configurações do bot da Landing Page (`LPBotSection`). No bot do WhatsApp (`AutomationsSection`), esse toggle não existe, embora a função `rotate-months` já processe as perguntas do WhatsApp (`wapi_bot_questions`) quando a flag está ativa.

### Solução
Adicionar um toggle na aba "Perguntas" do bot WhatsApp (`AutomationsSection.tsx`) que lê e grava o campo `auto_rotate_months` da tabela `lp_bot_settings` (mesma flag usada pela Edge Function `rotate-months`).

### Alterações

**Arquivo: `src/components/whatsapp/settings/AutomationsSection.tsx`**

1. Adicionar estado `autoRotateMonths` (boolean) e carregar o valor de `lp_bot_settings` ao selecionar uma instância
2. Na aba "Perguntas", após o header e antes da lista de perguntas, inserir um card com:
   - Icone `RefreshCw` (já importado)
   - Titulo: "Rotação Automática de Meses"
   - Descrição: "Remove o mês anterior e adiciona um novo mês no final da lista automaticamente, todo dia 1o de cada mês"
   - Toggle Switch que atualiza `lp_bot_settings.auto_rotate_months`
3. Ao toggle mudar, fazer upsert em `lp_bot_settings` para a `company_id` atual

### Resultado
- O toggle aparece na configuração do bot WhatsApp, na aba de Perguntas
- Usa a mesma flag do banco (`lp_bot_settings.auto_rotate_months`) que a Edge Function já consulta
- Funciona para ambos: perguntas do bot WhatsApp e opções de meses da LP
