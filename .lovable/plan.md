

# Página de Funcionalidades no Hub + Download PDF

## O que será feito

1. **Nova página `src/pages/HubFuncionalidades.tsx`** com grid de cards por categoria listando todas as 80+ funcionalidades
2. **Gerador PDF `src/lib/generateFeaturesPDF.ts`** usando jsPDF (mesmo padrão do `generateManualPDF.ts`)
3. **Rota, sidebar e menu mobile** atualizados

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/HubFuncionalidades.tsx` | Criar |
| `src/lib/generateFeaturesPDF.ts` | Criar |
| `src/App.tsx` | Adicionar rota `/hub/funcionalidades` + lazy import |
| `src/components/hub/HubLayout.tsx` | Adicionar `"funcionalidades"` ao tipo `currentPage` |
| `src/components/hub/HubSidebar.tsx` | Adicionar item "Funcionalidades" (ícone `BookOpen`) |
| `src/components/hub/HubMobileMenu.tsx` | Adicionar item "Funcionalidades" |

## Página HubFuncionalidades

- Usa `HubLayout` com `currentPage="funcionalidades"`
- Header com titulo "Funcionalidades" + botão "Baixar PDF" (primário)
- Categorias com ícones coloridos em grid responsivo (1 col mobile, 2-3 desktop)
- Cada categoria é um card com lista de funcionalidades (nome bold + descrição curta)
- 9 categorias: CRM & Vendas, WhatsApp & Automações, Agenda & Eventos, Operações, Contratos & Financeiro, Inteligência & IA, Portal Hub, Interfaces Públicas, Backend

## PDF (generateFeaturesPDF.ts)

- Reutiliza paleta de cores e helpers do `generateManualPDF.ts`
- Capa com logo + titulo
- Seções por categoria com header colorido roxo
- Cada funcionalidade: bullet com nome bold + descrição
- ~4-5 páginas A4
- Rodapé com "Celebrei" e numeração

## Detalhes técnicos

- Posicionar item "Funcionalidades" no menu entre "Materiais" e "Suporte" (penúltimo)
- Dados das funcionalidades definidos como constante estática no componente (sem query ao banco)
- Botão PDF chama `generateFeaturesPDF()` que faz download direto via blob URL

