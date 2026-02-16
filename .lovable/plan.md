

## Corrigir Respostas e Adicionar Metricas nas Avaliacoes

### Problema Identificado
O Sheet (painel lateral) de respostas pode nao estar abrindo corretamente porque esta renderizado dentro do `TabsContent`, que pode ocultar conteudo quando inativo. O Sheet precisa ser renderizado fora da estrutura de tabs para funcionar corretamente em todos os contextos.

### O que sera feito

**1. Corrigir abertura das respostas**
- Mover o Sheet de respostas para fora do componente `TabsContent`, garantindo que o portal do Sheet sempre esteja montado no DOM.

**2. Reorganizar a visualizacao de respostas com duas abas internas**
- **Aba "Respostas"**: Mostra os cards individuais de cada resposta recebida (como ja existe, mas funcionando).
- **Aba "Metricas"**: Exibe um resumo com as medias calculadas a partir de todas as avaliacoes:
  - Nota NPS media (0-10)
  - Media de estrelas por pergunta
  - Percentual de "Sim" nas perguntas booleanas
  - Quantidade total de respostas

**3. Cards de respostas melhorados**
- Cada resposta aparece como um card com cabecalho (nome + data), nota geral destacada, e as respostas formatadas com separadores visuais.

---

### Detalhes Tecnicos

**Arquivo: `src/pages/Avaliacoes.tsx`**

- Calcular metricas agregadas a partir do array `responses` ja carregado:
  - Para perguntas tipo `nps`: media aritmetica dos valores
  - Para perguntas tipo `stars`: media por pergunta
  - Para perguntas tipo `yesno`: percentual de `true`
  - Media geral (`overall_score`) de todas as respostas
- Adicionar `Tabs` dentro do `SheetContent` com duas abas: "Respostas" e "Metricas"
- Garantir que o componente `Sheet` esteja renderizado de forma independente (fora de qualquer condicional de tab)

**Estrutura da aba Metricas:**
- Card com nota media geral (overall_score)
- Lista de cada pergunta numerica/estrela com sua media
- Perguntas booleanas com percentual de "Sim"
- Total de respostas recebidas

