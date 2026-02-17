

## Adicionar novas seções ao DEFAULT_SECTIONS do Cardápio

### O que será feito
Incluir 7 novas seções ao array `DEFAULT_SECTIONS` em `src/pages/Cardapio.tsx`, mantendo as 4 seções existentes (Fritos, Assados, Doces, Bolo) e adicionando:

### Novas seções

| Seção | Emoji | Instrução | Max. Seleções | Opções |
|-------|-------|-----------|---------------|--------|
| **Bebidas** | 🥤 | Escolha as bebidas desejadas | null (livre) | Refrigerante Lata, Refrigerante 2L, Suco Natural de Laranja, Suco Natural de Maracujá, Suco Natural de Limão, Água Mineral, Água com Gás, Chá Gelado |
| **Pratos Quentes** | 🍕 | Escolha os pratos quentes desejados | null (livre) | Mini Pizza, Mini Hambúrguer, Cachorro-Quente, Batata Frita, Nuggets, Pipoca Gourmet, Crepe Salgado, Pastel |
| **Saladas / Frios** | 🥗 | Escolha as saladas e frios | null (livre) | Tábua de Frios, Salada Verde, Salada de Frutas, Salpicão, Mini Sanduíches, Finger Foods |
| **Sobremesas Especiais** | 🍫 | Escolha até 3 sobremesas especiais | 3 | Cascata de Chocolate, Algodão Doce, Crepe Suíço, Açaí, Sorvete, Churros, Paleta Mexicana, Fondue de Frutas |
| **Estações / Live Stations** | 🎪 | Escolha até 2 estações | 2 | Estação de Crepe, Estação de Churros, Estação de Pipoca Gourmet, Estação de Algodão Doce, Estação de Açaí, Estação de Sorvete |
| **Mesa do Bolo** | 🎀 | Escolha os itens para a mesa do bolo | null (livre) | Personalização de Tema, Topo de Bolo (Topper), Cupcakes Decorados, Cake Pops, Mini Tortas, Pirulitos Decorados |
| **Kit Lanche** | 🎁 | Escolha 1 opção de kit lanche | 1 | Kit Mini Sanduíche + Suco + Doce, Kit Salgado + Suco + Bala, Kit Pipoca + Suco + Pirulito, Sem Kit Lanche |

### Detalhes técnicos

**Arquivo**: `src/pages/Cardapio.tsx`

- Adicionar as 7 novas seções após a seção "bolo" (linha 72), dentro do array `DEFAULT_SECTIONS`
- Cada seção segue a mesma interface `CardapioSection` existente
- IDs: `bebidas`, `pratos_quentes`, `saladas_frios`, `sobremesas_especiais`, `estacoes`, `mesa_bolo`, `kit_lanche`
- Nenhum outro arquivo precisa ser alterado - o formulário público (`PublicCardapio.tsx`) já renderiza dinamicamente qualquer quantidade de seções

