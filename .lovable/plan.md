
## Melhorias na Seção de Imagem da Campanha

### Objetivo
Quando uma imagem ja estiver selecionada, adicionar opcoes de: regenerar arte com IA, incluir logotipo da empresa, e escolher foto do buffet. Quando nenhuma imagem estiver selecionada, manter as opcoes atuais (upload manual + gerar arte com IA) e adicionar botao para escolher foto do buffet.

### Mudancas

**Arquivo: `src/components/campanhas/CampaignContextStep.tsx`**

#### 1. Regenerar imagem com IA
Quando ja houver uma imagem (`draft.imageUrl` preenchida), adicionar um botao de regenerar (icone RefreshCw) ao lado do botao de excluir na area de preview. Ao clicar, chama `handleGenerateImage` novamente, substituindo a imagem atual.

#### 2. Incluir logotipo da empresa
Adicionar um botao "Usar Logotipo" que pega o `currentCompany?.logo_url` do `useCompany()` e define como `draft.imageUrl`. O botao so aparece se a empresa tiver logo configurado. Sera um botao com icone Building2 na lista de opcoes de imagem (quando nao ha imagem) e tambem como acao rapida quando ja ha imagem (para trocar).

#### 3. Usar foto do buffet (sales_materials)
Adicionar um botao "Fotos do Buffet" que abre um dialog/popover listando as fotos dos materiais de venda (`sales_materials` com `photo_urls`). O usuario seleciona uma foto e ela e definida como `draft.imageUrl`.

- Buscar do Supabase: `sales_materials` filtrado por `company_id` e `is_active = true`, pegando `photo_urls`
- Mostrar grid de thumbnails no dialog para selecao
- Ao clicar em uma foto, fecha o dialog e preenche `draft.imageUrl`

#### 4. Layout atualizado

**Sem imagem selecionada:**
- Upload manual (existente)
- Gerar Arte com IA (existente)
- Usar Logotipo (novo, so se empresa tem logo)
- Fotos do Buffet (novo, abre dialog com grid)

**Com imagem selecionada:**
- Preview com zoom (existente)
- Botoes de acao: Regenerar IA | Trocar | Excluir

### Detalhes tecnicos

- Novo estado: `photosDialogOpen` para controlar dialog de fotos
- Novo estado: `buffetPhotos` para armazenar fotos carregadas
- Query ao abrir dialog: `supabase.from("sales_materials").select("id, name, photo_urls").eq("company_id", currentCompanyId).eq("is_active", true)`
- Flatten `photo_urls` (array de strings em cada material) em uma lista unica de URLs
- Props ja recebidas: `companyName` -- precisamos tambem do `currentCompany` do contexto (ja importado via `useCompany`)
- Nenhuma alteracao no backend ou banco de dados
