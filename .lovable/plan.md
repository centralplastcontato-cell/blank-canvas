

## Miniatura de imagem no upload de Pacote de Precos (PDF)

### Problema
Quando o usuario faz upload de uma imagem como "Pacote de Precos" (tipo `pdf_package`), o dialog mostra apenas o icone generico de arquivo e o nome do arquivo. Ja nas colecoes de fotos, aparece a miniatura real da imagem. O usuario quer ver a miniatura tambem para pacotes.

### Solucao

Editar `src/components/whatsapp/settings/SalesMaterialsSection.tsx`, na secao de "Single file upload" (linhas 1004-1055).

Quando `formData.file_url` existe e a URL e de uma imagem (terminando em `.jpg`, `.jpeg`, `.png`, `.webp` ou contendo esses formatos), exibir uma miniatura da imagem ao inves do icone generico.

### Mudanca especifica

No bloco que exibe o arquivo ja enviado (linhas 1008-1021), substituir o layout atual por:

1. Verificar se `formData.file_url` e uma imagem usando uma funcao helper (checar extensao da URL)
2. Se for imagem: exibir um thumbnail (img tag) com `object-cover` em um container de ~64x64px, ao lado do nome e botao "Trocar"
3. Se nao for imagem (PDF real, video): manter o layout atual com icone

### Codigo aproximado

```typescript
const isImageFile = (url: string) => {
  const lower = url.toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif)/.test(lower);
};
```

No bloco de exibicao do arquivo:
```tsx
{formData.file_url ? (
  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
    {isImageFile(formData.file_url) ? (
      <img 
        src={formData.file_url} 
        alt="Preview" 
        className="w-16 h-16 object-cover rounded-md border"
      />
    ) : (
      getTypeIcon(formData.type)
    )}
    <span className="flex-1 truncate text-sm">
      {formData.file_path?.split("/").pop() || "Arquivo selecionado"}
    </span>
    <Button variant="ghost" size="sm" onClick={...}>
      Trocar
    </Button>
  </div>
) : ( ... )}
```

Tambem aplicar a mesma logica na **lista de materiais** (linhas 706-752): quando o material for `pdf_package` e a `file_url` for imagem, mostrar miniatura pequena (32x32) ao inves do icone generico de FileText.

### Arquivos a editar
- `src/components/whatsapp/settings/SalesMaterialsSection.tsx`

