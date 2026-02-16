

## Unificar e Mostrar Respostas Direto na Tela

### Problema
- Avaliações e Pré-Festa exibem o botão de respostas de formas diferentes (inconsistente)
- O usuário precisa clicar para abrir um painel lateral (Sheet) para ver as respostas
- A ideia é que os cards de respostas já apareçam direto na tela, sem precisar clicar ou abrir nada

### O que será feito

**1. Substituir o Sheet por uma seção expansível inline**
- Remover o componente Sheet de respostas em ambos os arquivos (Avaliacoes.tsx e PreFesta.tsx)
- Quando o template tiver respostas, exibir um Collapsible (acordeão) abaixo do card do template
- O Collapsible já começa **aberto por padrão** se houver respostas
- Ao clicar no indicador de respostas, ele alterna entre aberto/fechado

**2. Layout consistente entre Avaliações e Pré-Festa**
- Ambos terão o mesmo padrão visual: um link/botão "X respostas" que expande/recolhe a seção
- Os cards individuais de cada resposta aparecem logo abaixo do template, direto na tela
- Em Avaliações, manter as duas abas internas (Respostas e Métricas) dentro da seção expandida

**3. Cards de respostas inline**
- Cada resposta aparece como um card com cabeçalho (nome + data) e respostas formatadas
- Formatação mantida: estrelas, NPS (X/10), Sim/Não com emojis
- Em Avaliações: acima dos cards, duas abas (Métricas | Respostas)
- Em Pré-Festa: apenas a lista de cards de respostas

---

### Detalhes Técnicos

**Arquivos modificados:**
- `src/pages/Avaliacoes.tsx`
- `src/pages/PreFesta.tsx`

**Mudanças em ambos os arquivos:**
- Remover imports de Sheet/SheetContent/SheetHeader/SheetTitle
- Remover o estado `responsesSheetOpen`
- Alterar `openResponses()` para carregar as respostas e guardar no estado, sem abrir Sheet
- Adicionar estado `expandedTemplateId` para controlar qual template está expandido
- Usar Collapsible do Radix para expandir/recolher os cards de respostas abaixo de cada template
- Carregar respostas automaticamente ao montar (para templates com respostas)

**Em Avaliacoes.tsx especificamente:**
- Manter as Tabs internas (Métricas / Respostas) dentro da seção expandida
- Manter o cálculo de métricas (useMemo) funcionando com os dados carregados

**Fluxo visual (ambos):**
```text
+----------------------------------+
| Template Card                    |
|   Nome · Ativo · 2 respostas ▼  |
|   [Link] [Ver] [Editar] ...     |
+----------------------------------+
|  [Métricas] [Respostas]  (só    |
|                   em Avaliações) |
|  +----------------------------+  |
|  | Card Resposta 1            |  |
|  |  Nome · Data               |  |
|  |  Pergunta: Resposta        |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  | Card Resposta 2            |  |
|  +----------------------------+  |
+----------------------------------+
```
