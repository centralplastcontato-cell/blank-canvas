

## Adicionar 3a e 4a mensagens de follow-up automatico

### Contexto
Atualmente o sistema suporta 2 follow-ups automaticos. Buffets infantis precisam de mais tentativas porque a decisao de compra e mais demorada. Vamos adicionar o 3o e 4o follow-up seguindo exatamente o mesmo padrao dos dois existentes.

### Mudancas necessarias

**1. Banco de dados -- novas colunas em `wapi_bot_settings`**

Adicionar 6 colunas (3 por follow-up):
- `follow_up_3_enabled` (boolean, default false)
- `follow_up_3_delay_hours` (integer, default 72)
- `follow_up_3_message` (text, nullable)
- `follow_up_4_enabled` (boolean, default false)
- `follow_up_4_delay_hours` (integer, default 96)
- `follow_up_4_message` (text, nullable)

**2. Backend -- `supabase/functions/follow-up-check/index.ts`**

- Atualizar a interface `FollowUpSettings` com os 6 novos campos
- Atualizar o `select` na query de settings para incluir os novos campos
- Atualizar o filtro `.or()` para incluir `follow_up_3_enabled.eq.true,follow_up_4_enabled.eq.true`
- Adicionar blocos de processamento para follow-up 3 e 4 (replicando o padrao do 2):
  - Follow-up 3: `delayHours: 72`, `historyAction: "Follow-up #3 automatico enviado"`, `checkPreviousAction: "Follow-up #2 automatico enviado"`
  - Follow-up 4: `delayHours: 96`, `historyAction: "Follow-up #4 automatico enviado"`, `checkPreviousAction: "Follow-up #3 automatico enviado"`
- Atualizar `getDefaultFollowUpMessage()` para retornar mensagens para numeros 3 e 4

**3. Frontend -- `src/components/whatsapp/settings/AutomationsSection.tsx`**

- Atualizar a interface `BotSettings` com os 6 novos campos
- Adicionar UI para 3a e 4a mensagens na aba "Follow-ups", replicando o layout do 2o follow-up:
  - Badge "3a Mensagem" / "4a Mensagem"
  - Toggle enable/disable
  - Campo de delay em horas (min 48 / min 72)
  - Textarea para mensagem personalizada
  - Variaveis disponiveis: nome, unidade, mes, convidados
  - Cada um so pode ser ativado se o anterior estiver ativo

**4. Admin -- `src/pages/Admin.tsx`**

- Adicionar queries para `has_follow_up_3` e `has_follow_up_4` no `lead_history` (actions "Follow-up #3 automatico enviado" e "Follow-up #4 automatico enviado")
- Mapear os novos campos nos leads para exibicao de badges

### Arquivos a editar

| Arquivo | Mudanca |
|---|---|
| Nova migracao SQL | 6 colunas em `wapi_bot_settings` |
| `supabase/functions/follow-up-check/index.ts` | Interface, query, processamento do 3o e 4o follow-up |
| `src/components/whatsapp/settings/AutomationsSection.tsx` | Interface + UI para 3a e 4a mensagens |
| `src/pages/Admin.tsx` | Queries e badges para follow-up 3 e 4 |

### Resultado esperado
- Admin pode ativar ate 4 follow-ups sequenciais, cada um com tempo e mensagem personalizaveis
- Cada follow-up so e enviado se o lead nao respondeu ao anterior
- A cadeia e: 1o (24h padrao) -> 2o (48h) -> 3o (72h) -> 4o (96h)
- Totalmente configuravel por instancia/empresa

