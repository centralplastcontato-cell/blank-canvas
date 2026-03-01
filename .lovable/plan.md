

## Leads de BASE - Nova aba no modulo de Campanhas

### Conceito
Criar uma aba "Leads de Base" dentro da pagina de Campanhas para que buffets possam cadastrar manualmente contatos que ja possuem (clientes antigos, indicacoes, listas de contato) mas que nao estao no CRM. Esses contatos servem exclusivamente como audiencia para campanhas de ativacao.

Quando uma campanha e disparada para um lead de Base e ele responde no WhatsApp, o bot trata como um contato novo e inicia o fluxo completo de qualificacao, criando automaticamente o lead no CRM.

### Estrutura

**1. Nova tabela no Supabase: `base_leads`**
- `id` (uuid, PK)
- `company_id` (uuid, FK companies)
- `name` (text, obrigatorio)
- `phone` (text, obrigatorio - formato WhatsApp)
- `is_former_client` (boolean, default false)
- `former_party_info` (text, nullable - "quando foi a festa")
- `month_interest` (text, nullable - mes de interesse se nao for ex-cliente)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `created_by` (uuid, FK auth.users)

Com RLS habilitado, filtrando por `company_id` via `user_companies`.

**2. Modificar pagina `src/pages/Campanhas.tsx`**
- Adicionar duas abas usando Tabs: "Campanhas" e "Leads de Base"
- A aba "Campanhas" mantem o conteudo atual (lista de campanhas + botao Nova Campanha)
- A aba "Leads de Base" mostra a lista de contatos cadastrados + botao "Adicionar Contato"

**3. Criar `src/components/campanhas/BaseLeadsTab.tsx`**
- Lista de leads de base com busca
- Cards compactos mostrando nome, telefone, se foi cliente, mes de interesse
- Botao para adicionar novo contato
- Opcoes de editar e excluir

**4. Criar `src/components/campanhas/BaseLeadFormDialog.tsx`**
- Dialog com formulario:
  - Nome (obrigatorio)
  - Telefone/WhatsApp (obrigatorio, com mascara)
  - "Ja foi cliente?" (toggle Sim/Nao)
    - Se Sim: campo "Quando foi a festa?" (texto livre)
    - Se Nao: campo "Mes de interesse" (select com meses)
  - Observacoes (opcional)
- Validacao de campos obrigatorios
- Insert/Update no `base_leads`

**5. Modificar `src/components/campanhas/CampaignAudienceStep.tsx`**
- Adicionar um filtro/toggle "Origem" com opcoes: "CRM" | "Base" | "Todos"
- Quando "Base" ou "Todos" estiver selecionado, carregar tambem os leads de `base_leads`
- Os leads de Base aparecem na mesma lista com um badge "Base" para diferencia-los dos leads do CRM
- Os leads de Base sao mapeados para o mesmo formato `{ id, name, whatsapp }` para compatibilidade com o wizard

**6. Fluxo do bot (sem alteracao de codigo)**
- Como os leads de Base nao existem no CRM (`campaign_leads`), quando o bot recebe uma mensagem de um numero desconhecido, ele ja trata como novo contato e inicia qualificacao normalmente. Nenhuma alteracao e necessaria no webhook.

### Resumo visual da pagina

```text
+------------------------------------------+
| Campanhas                                |
| [Campanhas]  [Leads de Base]             |
+------------------------------------------+
|                                          |
|  Aba Campanhas: lista atual              |
|  Aba Leads de Base:                      |
|    [+ Adicionar Contato]                 |
|    [Busca...]                            |
|    - Maria Silva  (11) 9xxxx  Base       |
|    - Joao Santos  (11) 9xxxx  Ex-cliente |
|                                          |
+------------------------------------------+
```

### Arquivos envolvidos
1. **Nova migration SQL** - Criar tabela `base_leads` com RLS
2. **`src/pages/Campanhas.tsx`** - Adicionar Tabs (Campanhas / Leads de Base)
3. **`src/components/campanhas/BaseLeadsTab.tsx`** - Novo componente da aba
4. **`src/components/campanhas/BaseLeadFormDialog.tsx`** - Novo dialog de formulario
5. **`src/components/campanhas/CampaignAudienceStep.tsx`** - Adicionar filtro "Origem" e carregar base_leads
6. **`src/components/campanhas/CampaignWizard.tsx`** - Ajustar interface CampaignDraft para suportar leads de base

