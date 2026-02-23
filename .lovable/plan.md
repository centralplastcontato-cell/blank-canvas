

# Permitir imagens como "Pacote" (alem de PDF)

## Problema

O Planeta Divertido envia seus precos de pacotes como **imagens** (JPG/PNG), nao como PDF. Porem, o tipo "PDF de Pacote" so aceita arquivos PDF -- tanto no upload (validacao no front) quanto no envio pelo bot (sempre envia como `document`).

## Solucao

Transformar o tipo "PDF de Pacote" em um tipo mais generico que aceita tanto PDF quanto imagem. O sistema detectara automaticamente o formato do arquivo e enviara como `document` (PDF) ou `image` (foto), mantendo toda a logica de faixa de convidados e materiais universais.

## Alteracoes

### 1. Frontend -- Upload e validacao (`SalesMaterialsSection.tsx`)

- Renomear o label de "PDF de Pacote" para **"Pacote"** (ou "Pacote de Precos")
- Ampliar a validacao de tipo no `handleFileUpload` para aceitar `image/jpeg`, `image/png`, `image/webp` alem de `application/pdf` quando o tipo for `pdf_package`
- Atualizar o texto de ajuda: de "Apenas PDF (max. 50MB)" para "PDF ou Imagem (max. 50MB)"
- Atualizar o `accept` do input de arquivo para incluir formatos de imagem

### 2. Menu de envio manual (`SalesMaterialsMenu.tsx`)

- Detectar se o `file_url` do material e uma imagem (pela extensao: `.jpg`, `.jpeg`, `.png`, `.webp`) ou PDF
- Se for imagem, enviar como `image` em vez de `document`
- Ajustar o caption e fileName de acordo

### 3. Bot -- Flow Builder (`wapi-webhook/index.ts`)

- No bloco `send_pdf` do Flow Builder (linhas ~1335-1344): detectar se o arquivo e imagem pela extensao da URL
- Se for imagem, usar `sendBotImage` em vez de `sendBotDocument`

### 4. Bot -- Legacy (`wapi-webhook/index.ts`)

- Na funcao `sendQualificationMaterials` (linhas ~2648-2654): mesma logica -- detectar extensao e usar `sendImage` ou `sendDocument` conforme o caso

### 5. Bot -- Follow-up (`follow-up-check/index.ts`)

- Aplicar a mesma deteccao de tipo de arquivo na funcao equivalente de envio de materiais

## Detalhes tecnicos

**Funcao auxiliar de deteccao** (usada em todos os pontos):
```text
function isImageUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
}
```

**Fluxo de envio atualizado:**
```text
Material tipo "pdf_package"
  |
  +-- file_url termina em .jpg/.png/.webp?
  |     SIM --> envia como IMAGE (com caption)
  |     NAO --> envia como DOCUMENT (como PDF, com fileName .pdf)
```

**Impacto no banco de dados:** Nenhum. O tipo continua sendo `pdf_package` no banco. Apenas a logica de upload e envio se torna mais flexivel.

