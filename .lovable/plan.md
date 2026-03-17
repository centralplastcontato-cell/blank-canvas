

## Correção: `mark_existing_customer` → `cliente_retorno`

### Problema
No arquivo `supabase/functions/wapi-webhook/index.ts`, linha 1640, a ação `mark_existing_customer` do Flow Builder define `status: 'em_contato'` ao invés de `cliente_retorno`.

### Correção (1 arquivo, 1 linha principal)

**`supabase/functions/wapi-webhook/index.ts`** — linhas 1638-1641

Substituir:
```typescript
// Update lead status
if (conv.lead_id) {
  await supabase.from('campaign_leads').update({ status: 'em_contato' }).eq('id', conv.lead_id);
}
```

Por:
```typescript
// Update lead status to cliente_retorno (consistent with legacy bot)
if (conv.lead_id) {
  await supabase.from('campaign_leads').update({ 
    status: 'cliente_retorno',
    campaign_name: 'WhatsApp (Bot) - Cliente',
    observacoes: 'Cliente existente - retornou pelo WhatsApp',
  }).eq('id', conv.lead_id);
}
```

### Deploy
Após a edição, deploy automático da Edge Function `wapi-webhook`.

### Resultado
Qualquer lead que escolher a opção "já sou cliente" no Flow Builder será automaticamente classificado como `cliente_retorno` com a campanha e observações corretas — idêntico ao comportamento do bot legado.

