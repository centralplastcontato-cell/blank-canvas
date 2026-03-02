
## Adicionar "Tipo de Festa" aos Leads de Base e Filtro nas Campanhas

### Objetivo
Permitir categorizar cada lead de base por tipo de festa (aniversario, formatura, escolar, confraternizacao) para criar campanhas segmentadas por publico especifico. Exemplo: campanha so para empresas (confraternizacao) ou so para escolas (formatura).

### Mudancas

**1. Banco de dados -- nova coluna na tabela `base_leads`**

Adicionar coluna `party_type TEXT NULL` com migration SQL:
```sql
ALTER TABLE base_leads ADD COLUMN party_type text;
```

Valores possiveis: `aniversario`, `formatura`, `escolar`, `confraternizacao`, `outro` (ou nulo).

**2. Formulario de criacao/edicao -- `BaseLeadFormDialog.tsx`**

Adicionar um novo campo Select "Tipo de festa" na secao Historico, abaixo de "Mes de interesse", com as opcoes:
- Aniversario
- Formatura
- Escolar
- Confraternizacao
- Outro

O campo sera opcional. Novo estado `partyType`, salvo no payload do `handleSave`. Na edicao, o valor sera carregado do lead existente.

**3. Importacao CSV -- `BaseLeadImportDialog.tsx`**

- Adicionar coluna "Tipo de Festa" ao template CSV (coluna 7)
- Mapear valores no parser (ex: "aniversario" -> "aniversario", "formatura" -> "formatura", etc.)
- Incluir `party_type` no payload de insercao
- Corrigir tambem o bug existente que ignora `month_interest` para ex-clientes na importacao (linha 190)

Template atualizado:
```text
#;Nome;Telefone;Ex-Cliente?;Info Festa;Mes Interesse;Tipo de Festa;Observacoes
1;Maria Silva;11999887766;sim;Marco 2024;;aniversario;Indicacao
```

**4. Filtro na audiencia da campanha -- `CampaignAudienceStep.tsx`**

- Adicionar `party_type` na interface `Lead` e na query de `base_leads`
- Adicionar novo Select de filtro "Tipo de festa" no grid de filtros (mudando de 4 colunas para 5 ou quebrando em 2 linhas)
- Aplicar filtro no `useMemo` de `filtered`

Opcoes do filtro:
```text
Todos os tipos | Aniversario | Formatura | Escolar | Confraternizacao | Outro
```

**5. Lista de leads -- `BaseLeadsTab.tsx`**

- Adicionar `party_type` na interface `BaseLead` e na query
- Exibir o tipo de festa como badge ao lado do badge existente (Ex-cliente/Base) no card de cada lead

### Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| Migration SQL | `ALTER TABLE base_leads ADD COLUMN party_type text` |
| `BaseLeadFormDialog.tsx` | Novo Select + estado + interface + payload |
| `BaseLeadImportDialog.tsx` | Nova coluna template + parser + payload |
| `CampaignAudienceStep.tsx` | Novo filtro + campo na interface + query |
| `BaseLeadsTab.tsx` | Badge do tipo de festa nos cards |

### Layout do formulario atualizado

```text
--- Historico ---
Ja foi cliente?  (Sim) (Nao)
[Se Sim] Quando foi a festa?  ________
Mes de interesse  [Select v]
Tipo de festa     [Select v]    <-- NOVO
```
