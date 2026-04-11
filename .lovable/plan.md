

# Plano: PDF do contrato via WhatsApp com layout bonito (igual assinatura)

## Problema identificado

Quando o contrato e enviado via WhatsApp (sem assinatura), o PDF gerado pelo `renderContractHtmlToPdf` recebe apenas o HTML cru do contrato -- sem logo, sem titulo formatado, sem linha separadora. O resultado e um PDF de texto corrido (IMG_4626).

Ja quando enviado para assinatura, a pagina publica (`PublicContractSign.tsx`) renderiza o mesmo conteudo com um header bonito: logo centralizado, titulo em destaque, linha separadora, e texto justificado com fonte serif (IMG_4627).

## O que sera feito

Alterar **apenas** a funcao `renderContractHtmlToPdf` em `src/components/contracts/contractAuditHelpers.ts` para:

1. **Buscar o logo da empresa** usando o `companyId` (ja disponivel na funcao `sendContractViaWhatsApp`)
2. **Envolver o conteudo HTML** com um header formatado antes de renderizar:
   - Logo centralizado no topo
   - Titulo do contrato em negrito e uppercase
   - Linha separadora horizontal
   - Conteudo com `text-justify`, `font-serif`, e `line-height: 1.85`
3. **Passar o companyId** para `renderContractHtmlToPdf` (adicionando parametro)

## Escopo tecnico

**Arquivo unico**: `src/components/contracts/contractAuditHelpers.ts`

- Adicionar parametro `companyId` a `renderContractHtmlToPdf`
- Dentro da funcao, buscar `companies.logo_url` do Supabase
- Construir wrapper HTML com header identico ao da pagina de assinatura
- Atualizar a chamada interna na linha 211 para passar o `companyId`

## O que NAO sera alterado

- Nenhum outro arquivo
- Nenhuma logica de envio
- Nenhuma pagina ou componente visual
- Compatibilidade total com o fluxo de assinatura (que ja envia o PDF + link separadamente)

