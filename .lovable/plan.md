

## Galeria de Imagens de Campanhas

### Objetivo
Criar uma nova aba "Galeria" na pagina de Campanhas que exibe todas as imagens geradas/usadas nas campanhas, permitindo visualizacao rapida e reutilizacao.

### Fonte de Dados
As imagens ja estao salvas na tabela `campaigns` no campo `image_url`. A galeria vai buscar todas as campanhas que possuem imagem e exibir em formato de grid visual.

### Mudancas

**1. Nova aba na pagina `Campanhas.tsx`**

Adicionar uma terceira aba "Galeria" ao lado de "Campanhas" e "Leads de Base":

```text
Campanhas | Leads de Base | Galeria
```

A aba tera um icone de imagem (Image do lucide-react).

**2. Novo componente `CampaignGalleryTab.tsx`**

Componente que:
- Busca todas as campanhas da empresa que possuem `image_url IS NOT NULL`
- Exibe as imagens em um grid responsivo (2 colunas mobile, 3 desktop)
- Cada card mostra: miniatura da imagem, nome da campanha, tipo/tema e data de criacao
- Ao clicar na imagem, abre o `ImageLightbox` ja existente para visualizacao em tela cheia
- Estado vazio com mensagem orientando o usuario a criar campanhas com imagem

**3. Layout do card da galeria**

Cada card tera:
- Imagem com aspect-ratio quadrado e `object-cover`
- Overlay sutil no hover com nome da campanha
- Badge com o status da campanha (rascunho, enviada, etc.)
- Data de criacao no rodape

**4. Funcionalidade de reutilizacao (bonus simples)**

Nao incluso nesta versao para manter simplicidade. A galeria serve como referencia visual do historico.

### Arquivos

1. `src/components/campanhas/CampaignGalleryTab.tsx` - novo componente da galeria
2. `src/pages/Campanhas.tsx` - adicionar a terceira aba

