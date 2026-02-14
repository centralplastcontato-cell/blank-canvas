

## Corrigir Metrica de Orcamento Enviado no Resumo Diario

### Problema Atual
O sistema so conta "orcamento enviado" quando alguem muda manualmente o status do lead no CRM. Na pratica, o bot ja envia o orcamento (fotos, PDF, video) durante o fluxo de qualificacao. Quando o lead chega ao fim do bot (`complete_final` ou `flow_complete`), ele ja recebeu o orcamento.

Resultado: a metrica mostra numeros muito baixos porque depende de acao manual.

### Solucao
Mudar a logica da metrica "Orcamentos" para considerar **duas fontes**:

1. **Mudanca manual de status** para `orcamento_enviado` (como ja funciona)
2. **Leads que chegaram ao fim do bot hoje** (`bot_step` = `complete_final` ou `flow_complete`)

Isso reflete melhor a realidade: se o bot completou o fluxo, o orcamento foi enviado.

### Mudancas

**Arquivo: `supabase/functions/daily-summary/index.ts`**

- Buscar conversas com `bot_step IN ('complete_final', 'flow_complete')` que tiveram atividade hoje (via `lead_history`)
- Ou buscar no `lead_history` eventos de `bot_step_change` ou similar que indiquem conclusao do fluxo hoje
- Somar ao total de orcamentos: transicoes manuais de status + leads que completaram o bot hoje
- Usar `Set` para evitar duplicatas (um lead que completou o bot E teve status mudado manualmente conta apenas 1 vez)

### Detalhes Tecnicos

A query atual ja busca `statusChanges` do dia no `lead_history`. A mudanca adiciona uma segunda contagem: leads com `bot_step` final que tiveram qualquer evento no `lead_history` hoje, ou leads novos de hoje que ja tem `bot_step = complete_final`.

Para identificar leads que completaram o bot **hoje** (e nao em dias anteriores), usaremos os leads que aparecem no historico do dia OU foram criados hoje, e cujo `bot_step` atual e `complete_final` ou `flow_complete`.

