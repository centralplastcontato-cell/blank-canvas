

## Insight da IA em Accordion Colapsavel

### O que sera feito
Transformar o bloco de texto do "Insight da IA" em secoes colapsaveis (accordion), onde cada topico (ex: "Visao Geral do Dia", "Destaques Positivos", "Alertas e Pontos de Atencao", "Sugestoes de Proximos Passos") aparece como um item que pode ser expandido individualmente. O primeiro topico vira aberto por padrao.

### Como funciona
O texto da IA ja vem formatado com marcadores `**Titulo da Secao**` em linhas separadas. A logica vai:

1. Parsear o texto do `aiSummary` identificando linhas que contenham `**...**` como delimitadores de secao
2. Agrupar o conteudo entre cada titulo em secoes
3. Renderizar cada secao como um item de Accordion (usando o componente `@radix-ui/react-accordion` que ja esta instalado)
4. O primeiro item vem expandido por padrao, os demais colapsados

### Mudancas tecnicas

**Arquivo: `src/components/inteligencia/ResumoDiarioTab.tsx`**

- Criar uma funcao `parseAISections(text: string)` que:
  - Divide o texto por linhas
  - Identifica linhas com `**...**` como titulos de secao
  - Retorna um array de `{ title: string, content: string[] }`
  - Conteudo antes do primeiro titulo vai numa secao "Resumo"

- Substituir o render atual do `aiSummary` (linhas 528-533) por:
  - Um componente `Accordion` do Radix com `type="multiple"` e `defaultValue` apontando para o primeiro item
  - Cada `AccordionItem` com o titulo da secao como trigger e o conteudo como paragrafo colapsavel
  - Estilizacao com bordas suaves, icone de chevron e transicao de abertura

- Importar `Accordion, AccordionItem, AccordionTrigger, AccordionContent` de `@/components/ui/accordion`

### Resultado visual
Em vez de um bloco longo de texto, o usuario vera:
- **Visao Geral do Dia** (expandido por padrao)
- **Destaques Positivos** (colapsado, clica para expandir)
- **Alertas e Pontos de Atencao** (colapsado)
- **Sugestoes de Proximos Passos** (colapsado)

Cada secao expande com uma animacao suave ao clicar.

