

## Correção 2: Ampliar escopo de follow-up para leads inativos

### Problema atual
A função `processFollowUp` (linha 434-441) busca **apenas** leads que escolheram "Analisar com calma" (ação "Próximo passo escolhido" com valor "Analisar" ou "3"). Leads que ficam inativos em status como `orcamento_enviado` ou `aguardando_resposta` sem ter passado por essa escolha específica nunca recebem follow-up.

### Solução
Expandir o `processFollowUp` para buscar leads por **duas vias** (OR):

1. **Via atual**: leads que escolheram "Analisar com calma" (mantém comportamento existente)
2. **Via nova**: leads inativos cuja última mensagem do bot/agente foi enviada dentro da janela de tempo, e que estão em status `orcamento_enviado` ou `aguardando_resposta`

### Alterações no arquivo

**Arquivo**: `supabase/functions/follow-up-check/index.ts`

#### Mudança 1: Busca de leads inativos (após linha 441)
Adicionar uma segunda query para buscar conversas inativas na instância atual, onde:
- `instance_id` = instância sendo processada
- `last_message_from_me` = true (bot/agente enviou, lead não respondeu)
- `last_message_at` está dentro da janela `minTime` → `maxTime`
- Não é grupo (`@g.us`)
- Tem `lead_id` associado

Unir os `lead_id` das duas fontes (Set) para eliminar duplicatas.

#### Mudança 2: Expandir filtro de status (linha 530)
Trocar `.eq("status", "aguardando_resposta")` por `.in("status", ["aguardando_resposta", "orcamento_enviado"])` para incluir leads em orçamento enviado.

#### Mudança 3: Log descritivo
Atualizar logs para indicar quantos leads vieram de cada via (analisar vs inativo).

### Segurança multi-tenant
O isolamento por `instance_id` é mantido em ambas as vias. A query de conversas inativas filtra por `instance_id` da mesma forma que a via atual.

### Proteções existentes mantidas
- Verificação de follow-up já enviado (`lead_history` com `historyAction`)
- Verificação de resposta do lead (`last_message_from_me = false`)
- Verificação de follow-up anterior para FU2/3/4 (`checkPreviousAction`)
- Test mode guard
- Append de opções numeradas na mensagem

### Resultado esperado
Leads inativos em `orcamento_enviado` e `aguardando_resposta` passam a receber follow-ups mesmo sem ter escolhido "Analisar com calma", cobrindo os 519+ leads que hoje ficam sem acompanhamento.

