
# Migrar materiais de venda do Castelo da Diversao para o storage atual

## Problema
Todos os 18 materiais de venda do Castelo da Diversao (company_id `a0000000-0000-0000-0000-000000000001`) apontam para o storage antigo (`knyzkwgdmclcwvzhdmyk.supabase.co`), incluindo:
- 12 PDFs de pacotes (6 Manchester + 6 Trujillo)
- 2 videos (Manchester)
- 2 colecoes de fotos (Manchester + Trujillo, com ~20 fotos no total)
- 2 fotos avulsas (Trujillo)

## Solucao
Criar uma edge function `migrate-castelo-materials` que:

1. **Busca todos os materiais** da tabela `sales_materials` onde `company_id = 'a0000000-...-000000000001'`
2. **Para cada material**, faz fetch do arquivo do storage antigo via URL publica
3. **Faz upload** para o bucket `sales-materials` no storage atual (`rsezgnkfhodltrsewlhz`), mantendo o mesmo `file_path`
4. **Atualiza o registro** na tabela `sales_materials` trocando o dominio da URL de `knyzkwgdmclcwvzhdmyk` para `rsezgnkfhodltrsewlhz`
5. **Processa tambem `photo_urls`** das colecoes de fotos (mesmo padrao de replace)

## Detalhes tecnicos

### Arquivo: `supabase/functions/migrate-castelo-materials/index.ts`

```text
Fluxo:
1. Query: SELECT * FROM sales_materials WHERE company_id = '...'
2. Para cada registro:
   a. Fetch file_url do storage antigo
   b. Upload para sales-materials bucket no storage atual (mesmo file_path)
   c. Gerar nova public URL
   d. Se photo_urls existir, repetir para cada foto
   e. UPDATE sales_materials SET file_url = nova_url, photo_urls = novas_urls WHERE id = ...
3. Retornar resumo com contagem de sucesso/erro
```

### Constantes
- `OLD_STORAGE = "knyzkwgdmclcwvzhdmyk"`
- `NEW_STORAGE = "rsezgnkfhodltrsewlhz"`  
- `COMPANY_ID = "a0000000-0000-0000-0000-000000000001"`
- Bucket destino: `sales-materials` (ja existe e e publico)

### Estrategia de URL
Substituicao simples do dominio na URL:
```
https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/...
->
https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/sales-materials/...
```
O `file_path` relativo permanece identico.

### Execucao
- A function sera chamada manualmente uma unica vez via curl/invoke
- Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS
- Logs detalhados de cada arquivo processado
- Nao deleta os arquivos antigos (sao de outro projeto)
