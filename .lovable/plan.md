

## Corrigir auto-lost para disparar apos o ultimo follow-up ativo

### Problema
A funcao `processAutoLost` em `supabase/functions/follow-up-check/index.ts` busca fixamente pela acao `"Follow-up #4 automatico enviado"` no historico. Se o buffet desativa o 3o e 4o follow-ups, o auto-lost nunca dispara.

### Solucao

**Arquivo unico: `supabase/functions/follow-up-check/index.ts`** (linhas ~959-1098)

Substituir a logica fixa por uma dinamica que identifica o ultimo follow-up habilitado:

1. **Determinar a acao do ultimo follow-up ativo** (verificando flags na ordem reversa):
   - `follow_up_4_enabled` -> `"Follow-up #4 automatico enviado"`
   - `follow_up_3_enabled` -> `"Follow-up #3 automatico enviado"`
   - `follow_up_2_enabled` -> `"Follow-up #2 automatico enviado"`
   - `follow_up_enabled` -> `"Follow-up automatico enviado"`
   - Se nenhum habilitado -> retorna sem processar

2. **Usar essa acao na query** ao `lead_history` (linha 976), substituindo o valor fixo `"Follow-up #4 automatico enviado"` pela variavel determinada

3. **Atualizar a mensagem de notificacao** (linha 1083) para refletir o numero correto do follow-up, ex: "apos nao responder ao 2o follow-up" em vez de fixo "4o follow-up"

4. **Atualizar o log** (linha 967) para mostrar qual follow-up esta sendo usado como referencia

```text
Exemplo de fluxo:

Buffet com FU1 + FU2 ativos (FU3 e FU4 desativados):
  FU1 enviado -> FU2 enviado -> [espera auto_lost_delay_hours] -> PERDIDO

Buffet com todos os 4 ativos (comportamento atual mantido):
  FU1 -> FU2 -> FU3 -> FU4 -> [espera auto_lost_delay_hours] -> PERDIDO
```

### Impacto
- Apenas 1 arquivo alterado (edge function)
- Nenhuma alteracao no banco de dados ou frontend
- Retrocompativel: buffets com 4 follow-ups continuam funcionando igual
- Deploy automatico da edge function
