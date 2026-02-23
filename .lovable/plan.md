

# Corrigir upload de PDF no iOS (galeria/arquivos nao abre)

## Problema

No iOS Safari, o campo de upload com `accept=".pdf,application/pdf"` pode nao abrir o seletor de arquivos corretamente. O iOS tem limitacoes conhecidas com o atributo `accept` em inputs de arquivo, especialmente para PDFs.

## Solucao

Ampliar o atributo `accept` do input de arquivo para PDFs, usando `accept="*/*"` ou `accept=".pdf,application/pdf,application/octet-stream"` quando o tipo for `pdf_package`. Isso garante que o iOS apresente o seletor de arquivos (app Arquivos) corretamente. A validacao do tipo de arquivo sera mantida no handler `handleFileUpload`, que ja verifica a extensao e o MIME type antes de aceitar o upload.

## Alteracao tecnica

**Arquivo: `src/components/whatsapp/settings/SalesMaterialsSection.tsx`**

Na linha 1046-1051, alterar o `accept` para PDF de:
```
".pdf,application/pdf"
```
Para:
```
".pdf,application/pdf,application/octet-stream,*/*"
```

Isso faz o iOS abrir o seletor completo de arquivos (com acesso a iCloud Drive, Downloads, etc.), enquanto a validacao no codigo continua garantindo que apenas PDFs sejam aceitos.

Tambem sera necessario verificar o `handleFileUpload` para garantir que ele valide corretamente o tipo do arquivo apos a selecao, rejeitando arquivos que nao sejam PDF quando o tipo for `pdf_package`.

