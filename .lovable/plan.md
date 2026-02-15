

## Fix: Follow-ups nao aparecem no Resumo do Dia

### Problema
Os cards "Follow-up 24h" e "Follow-up 48h" mostram **0** mesmo com 8 follow-ups enviados hoje. Isso acontece porque o registro no `lead_history` feito pela edge function `follow-up-check` **nao inclui o `company_id`**, deixando o campo como NULL no banco de dados.

O `daily-summary` filtra os eventos com `.eq("company_id", company_id)`, entao registros com `company_id = NULL` sao ignorados.

### Evidencia
Query no banco confirmou que todos os 8 registros de follow-up de hoje tem `company_id = NULL`.

### Solucao

**Arquivo: `supabase/functions/follow-up-check/index.ts`**

Na funcao `processFollowUp` (linha 525), adicionar `company_id: instance.company_id` ao insert do `lead_history`:

```
await supabase.from("lead_history").insert({
  lead_id: lead.id,
  company_id: instance.company_id,  // <-- ADICIONAR
  action: historyAction,
  new_value: `Mensagem de acompanhamento #${followUpNumber} apos ${delayHours}h`,
});
```

A variavel `instance` ja esta disponivel no escopo (linha 440-444) e contem o `company_id` correto.

### Correcao retroativa dos dados existentes
Alem do fix no codigo, sera necessario corrigir os registros ja criados com `company_id = NULL`. Isso pode ser feito com uma query SQL que busca o `company_id` atraves do `lead_id`:

```sql
UPDATE lead_history lh
SET company_id = cl.company_id
FROM campaign_leads cl
WHERE lh.lead_id = cl.id
  AND lh.company_id IS NULL
  AND lh.action IN ('Follow-up automatico enviado', 'Follow-up #2 automatico enviado');
```

### Resultado
Apos o deploy, os proximos follow-ups serao registrados com `company_id` e aparecerao corretamente nos cards do Resumo do Dia. A query retroativa corrige os dados historicos.
