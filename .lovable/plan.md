

## Incluir vídeo na Landing Page do Aventura Kids

### Situação atual
A LP do Aventura Kids (`slug: aventura-kids`, `company_id: eb1776f0-142e-41db-9134-7d352d02c5bd`) já tem a seção de vídeo **habilitada** com um vídeo existente hospedado no Supabase Storage (`onboarding-uploads`).

### Plano

**1. Copiar o vídeo para o projeto e fazer upload ao Supabase Storage**
- Copiar o arquivo `user-uploads://b9ee738a-e003-45c4-84ef-df8465c827ce.mp4` para o bucket `landing-pages` no Supabase Storage, na pasta do Aventura Kids.

**2. Atualizar o JSON de vídeo na tabela `company_landing_pages`**
- Substituir o `video_url` atual pelo novo URL público do Storage.
- Manter o `poster_url` (fachada) e demais configurações (`enabled: true`, `video_type: upload`, `title`).

### Detalhes técnicos
- Bucket de destino: `landing-pages` (público)
- Path no storage: `eb1776f0-142e-41db-9134-7d352d02c5bd/videos/aventura-kids-video.mp4`
- O upload será feito via código no componente ou diretamente pelo edge function `resize-image` existente? **Não** — será feito copiando o arquivo para `public/` e depois subindo via SQL/Storage API no deploy.
- Alternativa mais prática: copiar o vídeo para `public/videos/` para uso imediato e atualizar o campo `video_url` no banco para apontar ao URL público do Supabase Storage após upload manual, **ou** usar o código existente de upload do `SalesMaterialsSection` como referência para subir via frontend.

**Abordagem escolhida**: Copiar o vídeo para `public/videos/aventura-kids.mp4`, referenciar temporariamente pelo URL do preview, e em seguida atualizar o banco com o URL definitivo do Storage. Na prática, o mais eficiente é fazer o upload diretamente ao bucket `landing-pages` e atualizar o registro via SQL.

