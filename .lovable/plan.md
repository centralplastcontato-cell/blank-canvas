

## Objetivo
Adicionar um botão **"Imprimir para Cozinha"** no painel lateral de respostas do Cardápio, gerando um PDF profissional e organizado que o buffet pode imprimir e entregar na cozinha no dia da festa.

## Layout do PDF (A4 retrato)

**Cabeçalho:**
- Logotipo do buffet centralizado (topo)
- Nome do buffet
- Título: "CARDÁPIO DA FESTA"
- Linha divisória

**Bloco de informações do evento:**
- 👤 Cliente: [Nome do respondente]
- 🎉 Data da festa: [Data formatada por extenso]
- 📅 Preenchido em: [Data/hora do envio]
- 🍽️ Template: [Nome do cardápio escolhido]

**Corpo — Itens selecionados por seção:**
- Cada seção em um bloco destacado com fundo levemente colorido
- Emoji + título da seção em fonte grande/bold (ex: 🍤 SALGADOS FRITOS E ASSADOS)
- Lista vertical de itens marcada com ✓, fonte legível (12pt) — não em parágrafo corrido, mas um item por linha para facilitar leitura na cozinha
- Espaçamento generoso entre seções

**Rodapé:**
- "Documento gerado em [data/hora]"
- Numeração de páginas

## Onde aparece o botão
Dentro do `Sheet` lateral de respostas do Cardápio (mesma área onde hoje fica "Apagar resposta"), adicionar botão **"🖨️ Imprimir para Cozinha"** em destaque (variant primary), posicionado acima do botão de apagar.

## Mudanças técnicas

**Arquivo 1 (novo):** `src/lib/cardapioPrintPDF.ts`
- Função `generateCardapioPrintPDF(response, template, company)` usando `jsPDF` + `jspdf-autotable` (já instalados no projeto, conforme `SchedulePDFGenerator.ts`).
- Carrega o logo via `Image` com `crossOrigin="anonymous"` (mesmo padrão do `SchedulePDFGenerator`).
- Itera sobre `template.sections`, para cada seção renderiza título com emoji + lista de itens selecionados (`response.answers[i].selected`).
- Suporta múltiplas páginas automaticamente (verifica `y > 270` e chama `doc.addPage()`).
- Salva como `Cardapio_[NomeCliente]_[DataFesta].pdf`.

**Arquivo 2 (editar):** `src/pages/Cardapio.tsx`
- Importar a nova função.
- No componente `CardapioResponseCards`, dentro do `Sheet` lateral, adicionar botão "Imprimir para Cozinha" com ícone `Printer` (lucide-react).
- Passar `currentCompany` (logo + nome) via `useCompany()` ou prop.

## Fora de escopo
- Não altera a tela de listagem nem os cards (mantém o layout aprovado anteriormente).
- Não cria nova rota nem edge function — geração 100% client-side.
- Não toca em RLS, banco ou edge functions.

