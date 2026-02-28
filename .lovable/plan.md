

## Intervalo de segurança configurável para envio em grupos

### O que muda

1. **Novo campo em `companies.settings`**: `group_message_delay_seconds` (padrão: 60 segundos, como solicitado)

2. **Nova card em Configuracoes > Automacoes > Gatilhos**: "Intervalo de Segurança" com um slider ou inputs min/max para definir o delay entre mensagens enviadas para grupos de WhatsApp

3. **`SendScheduleToGroupsDialog`**: ao abrir, carrega o valor de `group_message_delay_seconds` da empresa e usa como delay (em vez do fixo 1-3s atual)

### Detalhes técnicos

**Arquivo: `src/components/whatsapp/settings/AutomationsSection.tsx`**
- Na sub-aba "Gatilhos", adicionar um card "Intervalo de Segurança" com:
  - Input numérico para definir o intervalo em segundos (mínimo 5s, máximo 120s)
  - Texto explicativo sobre risco de bloqueio
  - Salva em `companies.settings.group_message_delay_seconds`

**Arquivo: `src/components/freelancer/SendScheduleToGroupsDialog.tsx`**
- No `loadData()`, carregar `group_message_delay_seconds` do `companies.settings`
- Substituir `randomDelay(1000, 3000)` por `randomDelay(delay * 1000, delay * 1000 + 2000)` onde `delay` vem da config (padrão 60s)
- Exibir o intervalo configurado no progress (ex: "Aguardando ~60s...")

**Nenhuma migration necessária** -- o campo é salvo dentro do JSONB `settings` da tabela `companies` que já existe.

### Valor padrão

O padrão será **60 segundos** (1 minuto) conforme solicitado, com variação aleatória de +0 a +2 segundos para parecer mais humano.
