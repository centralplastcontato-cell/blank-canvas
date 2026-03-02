
## Corrigir erro de UUID na criacao de campanha com leads de base

### Problema
Quando um lead de base e selecionado para uma campanha, o sistema prefixa o ID com `base_` (ex: `base_c751c20a-...`) para diferenciar dos leads do CRM na interface. Porem, ao salvar os destinatarios na tabela `campaign_recipients`, esse ID prefixado e inserido na coluna `lead_id` que espera um UUID valido, causando o erro:

```
invalid input syntax for type uuid: "base_c751c20a-c0d9-4fb2-beb3-d7804ff17b76"
```

### Solucao

Alterar o `CampaignWizard.tsx` na funcao `handleCreate` para remover o prefixo `base_` antes de inserir o `lead_id` na tabela de destinatarios. Tambem tornar o campo `lead_id` opcional (null) para leads de base, ja que eles pertencem a tabela `base_leads` e nao a `campaign_leads`.

**Arquivo: `src/components/campanhas/CampaignWizard.tsx`**

Na construcao do array `recipients` (linha ~91-97), verificar se o `lead.id` comeca com `base_` e, nesse caso:
- Extrair o UUID real removendo o prefixo
- Salvar o UUID real no `lead_id` (que referencia a tabela correta)

```typescript
const recipients = selectedLeads.map((lead, i) => {
  const isBase = lead.id.startsWith("base_");
  const realId = isBase ? lead.id.replace("base_", "") : lead.id;
  return {
    campaign_id: campaign.id,
    lead_id: realId,
    phone: lead.whatsapp,
    lead_name: lead.name,
    variation_index: i % draft.variations.length,
    status: "pending",
  };
});
```

### Detalhes tecnicos
- Arquivo editado: `src/components/campanhas/CampaignWizard.tsx`, linhas 91-97
- Mudanca minima: apenas extrair o UUID real antes da insercao
- Nenhuma mudanca de banco de dados necessaria
