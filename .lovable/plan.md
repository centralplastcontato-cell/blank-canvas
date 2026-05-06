## Correção

Reverter a lógica que escolhe entre `sendImage` e `sendDocument` para materiais do tipo `pdf_package`. Voltar ao comportamento original: **sempre enviar como documento `.pdf`**, independente da extensão real do arquivo. Era assim que funcionava antes do commit `93f2c6d4` (23/02/2026), e era assim que o Aventura Kids recebia os pacotes corretamente.

## Arquivos alterados

**`supabase/functions/wapi-webhook/index.ts`** — 2 trechos:

1. Linha ~2183 (Flow Builder, ação `send_pdf`):
   - Remover a checagem `isPkgImage`.
   - Voltar a chamar sempre `sendBotDocument(...)` com nome `<nome>.pdf` e salvar como `message_type: 'document'`.

2. Linha ~3903 (`sendQualificationMaterials`, envio automático após qualificação):
   - Remover a checagem `isPkgImage`.
   - Voltar a chamar sempre `sendDocument(pdf.file_url, fileName)` com nome `<nome>.pdf`.

Também tem um terceiro ponto similar em `send_pdf_values` (linha ~4631) que já segue o mesmo padrão problemático — vou reverter junto, por consistência.

## O que NÃO vou mexer

- Nada na lógica de conexão WhatsApp (W-API/Z-API).
- Nada nos cadastros existentes (`sales_materials`).
- Nada na UI de upload de materiais.
- Nada nas outras unidades — a mudança é compatível: PDFs continuam sendo enviados como PDF, e imagens cadastradas como pacotes voltam a ser enviadas como documento `.pdf` (que é o WhatsApp anexa normalmente).

## Resultado esperado

Próxima conversa com lead do Aventura Kids: o bot envia os 6 pacotes como **documento PDF anexado** no chat, igual ao comportamento de antes do dia 23/02. As outras unidades não são afetadas.

Após a correção, o webhook é redeployado automaticamente.