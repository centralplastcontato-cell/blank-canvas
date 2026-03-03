

## Salvar imagens geradas na galeria imediatamente

### Problema
Hoje a galeria so mostra imagens de campanhas **finalizadas** (tabela `campaigns`). Se o usuario gera uma arte com IA mas nao completa o wizard, a imagem se perde e nao aparece na galeria.

### Solucao
Criar uma tabela dedicada `campaign_images` para armazenar todas as artes geradas, independente de estarem vinculadas a uma campanha ou nao. A galeria passa a exibir imagens dessa tabela.

### Detalhes Tecnicos

**1. Nova tabela `campaign_images`**

```text
campaign_images
  id            uuid PK
  company_id    uuid FK -> companies
  image_url     text NOT NULL
  source        text  ('ai_compose' | 'upload' | 'logo')
  campaign_id   uuid FK -> campaigns (nullable, preenchido quando vinculada)
  campaign_name text  (nome da campanha ou tipo, para exibicao)
  created_by    uuid FK -> auth.users
  created_at    timestamptz
```

- RLS: usuarios so veem imagens da propria empresa
- Quando uma campanha e criada com imagem, atualiza `campaign_id` no registro existente

**2. Frontend - `CampaignContextStep.tsx`**

Apos `handleComposeArt` gerar a imagem com sucesso, inserir um registro em `campaign_images` com:
- `company_id` atual
- `image_url` retornada pela IA
- `source: 'ai_compose'`
- `campaign_name: draft.campaignType || draft.name`

Mesma logica para `handleImageUpload` (source: `upload`) e `handleUseLogo` (source: `logo`).

**3. Frontend - `CampaignGalleryTab.tsx`**

Trocar a query de `campaigns` para `campaign_images`:
- Buscar `campaign_images` da empresa, ordenadas por `created_at DESC`
- Exibir badge "IA" vs "Upload" baseado no campo `source`
- Mostrar nome da campanha vinculada quando houver

**4. Frontend - `CampaignWizard.tsx`**

Ao criar a campanha com `handleCreate`, atualizar o registro em `campaign_images` com o `campaign_id` para vincular a arte a campanha criada.

### Arquivos Modificados

1. **Nova migration SQL** - Criar tabela `campaign_images` com RLS
2. **`src/components/campanhas/CampaignContextStep.tsx`** - Inserir em `campaign_images` ao gerar/upload imagem
3. **`src/components/campanhas/CampaignGalleryTab.tsx`** - Query de `campaign_images` em vez de `campaigns`
4. **`src/components/campanhas/CampaignWizard.tsx`** - Vincular `campaign_id` ao criar campanha

### Resultado
Toda imagem gerada pela IA, uploaded ou logo aplicado aparece imediatamente na galeria, mesmo que o usuario nao finalize a campanha.

