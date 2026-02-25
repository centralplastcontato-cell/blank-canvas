

## Auto-Perdido apos 4o Follow-up

### Resumo
Adicionar funcionalidade para mover automaticamente leads para status "perdido" quando passarem pelo 4o follow-up sem responder, com periodo de espera configuravel.

### Mudancas necessarias

#### 1. Banco de dados - Nova coluna em `wapi_bot_settings`
Adicionar duas colunas:
- `auto_lost_enabled` (boolean, default false) - ativa/desativa o auto-perdido
- `auto_lost_delay_hours` (integer, default 48) - horas apos o 4o follow-up para marcar como perdido

#### 2. Edge Function `follow-up-check/index.ts`
Adicionar nova funcao `processAutoLost` que:
- Busca leads que ja receberam o 4o follow-up (`lead_history.action = "Follow-up #4 automatico enviado"`)
- Verifica se o tempo desde o 4o follow-up excedeu `auto_lost_delay_hours`
- Confirma que o lead nao respondeu (`last_message_from_me = true` na conversa)
- Confirma que o lead ainda esta em `aguardando_resposta`
- Atualiza o status do lead para `perdido`
- Registra no `lead_history` com action "Lead movido para perdido automaticamente"
- Envia notificacao para o responsavel

Chamar `processAutoLost` no loop principal, apos o processamento do 4o follow-up, para cada instancia que tenha `auto_lost_enabled = true`.

Atualizar o `FollowUpSettings` interface para incluir `auto_lost_enabled` e `auto_lost_delay_hours`.

Atualizar a query de fetch dos settings para incluir as novas colunas.

#### 3. UI - `AutomationsSection.tsx`
Na aba de follow-ups, apos o card do 4o follow-up, adicionar um novo card "Auto-Perdido":
- Switch para ativar/desativar
- Input de horas para configurar o delay apos o 4o follow-up (default 48h, min 24h, max 720h)
- Label dinamica mostrando a conversao em dias
- Texto explicativo: "Leads que nao responderam apos o 4o follow-up serao movidos automaticamente para Perdido"

Atualizar a interface `BotSettings` para incluir os novos campos.

### Detalhes tecnicos

```text
Fluxo do auto-perdido:

Lead escolhe "Analisar com calma"
    |
[Follow-ups 1-4 enviados sem resposta]
    |
[4o Follow-up enviado] --> lead_history registra timestamp
    |
[Espera auto_lost_delay_hours (ex: 48h)]
    |
Lead NAO respondeu?
    |-- SIM --> Status = "perdido" + registro no historico
    |-- NAO --> Nada acontece (lead respondeu, sequencia ja parou)
```

### Arquivos modificados
1. **Migration SQL** - Adicionar colunas `auto_lost_enabled` e `auto_lost_delay_hours` na tabela `wapi_bot_settings`
2. **`supabase/functions/follow-up-check/index.ts`** - Nova funcao `processAutoLost` + integracao no loop principal
3. **`src/components/whatsapp/settings/AutomationsSection.tsx`** - Novo card de configuracao na aba followups + campos no interface BotSettings

