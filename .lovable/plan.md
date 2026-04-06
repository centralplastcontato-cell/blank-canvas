

## Diagnóstico: Robô do Castelo cortando etapas e não enviando materiais

### O que está acontecendo

O problema é um **descasamento de nomes** entre as instâncias de WhatsApp e os materiais de venda no banco de dados:

```text
Instâncias WhatsApp (wapi_instances):
  ├── Vendas 1  ← conectada (15991336278)
  ├── Vendas 2  ← desconectada
  └── Vendas 3  ← conectada (15991425170)

Materiais de Venda (sales_materials):
  └── Castelo da Diversão  ← todos os 16 materiais ativos estão com esse nome
```

Quando o robô termina a qualificação e vai buscar materiais, ele faz:
```
SELECT * FROM sales_materials WHERE unit = 'Vendas 1' AND is_active = true
```
Resultado: **0 materiais encontrados**. O robô pula direto para a pergunta de próximo passo.

### Por que os outros buffets funcionam normalmente

| Buffet | Instância unit | Materiais unit | Match? |
|--------|---------------|----------------|--------|
| Aventura Kids | `Aventura Kids` | `Aventura Kids` | Sim |
| Planeta Divertido | `Planeta Divertido` | `Planeta Divertido` | Sim |
| Castelo da Diversão | `Vendas 1` / `Vendas 3` | `Castelo da Diversão` | **Não** |

O Castelo é o único com nomes diferentes porque as instâncias foram renomeadas (provavelmente na migração da unidade Manchester), mas os materiais mantiveram o nome original.

### Como isso funcionava antes

Antes, as instâncias provavelmente tinham `unit = "Castelo da Diversão"` (ou similar) e batia com os materiais. Quando as instâncias foram renomeadas para "Vendas 1", "Vendas 2", "Vendas 3", os materiais ficaram órfãos.

### Correção proposta

Tornar a busca de materiais mais robusta, usando `company_id` como fallback quando não encontra materiais pela `unit` exata. Assim funciona independente do nome da instância.

**Arquivo:** `supabase/functions/wapi-webhook/index.ts`

Na função `sendQualificationMaterials` (linha ~2920):

1. Manter a busca atual por `unit` (para empresas que têm materiais separados por unidade).
2. Se não encontrar nenhum material por `unit`, fazer uma segunda busca por `company_id` (fallback).
3. Isso resolve o Castelo imediatamente e protege contra renomeações futuras em qualquer buffet.

```text
Busca materiais por unit ("Vendas 1")
  └── Encontrou? → Usa esses materiais
  └── Não encontrou? → Busca por company_id
       └── Encontrou? → Usa esses materiais
       └── Não encontrou? → Log e pula (comportamento atual)
```

Nenhuma alteração em dados do banco necessária. Nenhuma mudança em conexão WhatsApp.

