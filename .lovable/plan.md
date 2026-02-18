

## Aba "Avaliacoes" dedicada dentro da secao Freelancer

Atualmente, as avaliacoes dos freelancers aparecem embutidas dentro do card de cada resposta (na aba Freelancer > Respostas). A proposta e criar uma aba dedicada "Avaliacoes" dentro da secao Freelancer, separando claramente o cadastro das avaliacoes.

### Estrutura das abas

A secao **Freelancer** (no topo da pagina Operacoes) passara a ter duas sub-abas:
- **Cadastro** - conteudo atual (templates, respostas, formularios)
- **Avaliacoes** - nova aba com visao consolidada de todas as avaliacoes por freelancer

### Aba "Avaliacoes" - O que vai mostrar

Uma lista de todos os freelancers que possuem avaliacoes registradas na empresa, cada um com:
- Nome do freelancer + badge de media geral
- Ao expandir: historico completo de avaliacoes (data do evento, notas por criterio, observacoes, quem avaliou)
- Medias por criterio calculadas a partir de todas as avaliacoes
- Possibilidade de ver avaliacoes de gerentes diferentes ao longo do tempo

### Remover "Gerente" da avaliacao

O role "Gerente de Festa" sera excluido da lista de freelancers avaliados. Na logica de extracao de nomes do `staff_data`, os entries pertencentes ao role com titulo "Gerente" (ou "Gerente de Festa") serao filtrados, tanto na pagina publica (`PublicStaffEvaluation`) quanto no dialog interno (`FreelancerEvaluationDialog`).

### Detalhes tecnicos

1. **Formularios.tsx** - Alterar a `TabsContent` de "freelancer" para conter sub-tabs ("cadastro" e "avaliacoes"), seguindo o mesmo padrao usado em "formularios" e "checklist"

2. **Novo componente `FreelancerEvaluationsTab.tsx`** - Componente que:
   - Busca todos os registros de `freelancer_evaluations` da empresa
   - Agrupa por `freelancer_name`
   - Mostra lista expansivel com media geral + historico detalhado
   - Reutiliza `FreelancerEvaluationHistory` para exibir as avaliacoes individuais

3. **Filtro de "Gerente"** - Em `PublicStaffEvaluation.tsx` e `FreelancerEvaluationDialog.tsx`, adicionar filtro para excluir entries cujo `roleTitle` contenha "Gerente" ao extrair a lista de freelancers para avaliacao

4. **FreelancerManagerContent** - Remover ou simplificar a exibicao de avaliacoes inline nos cards de resposta (ja que terao aba propria), mantendo apenas o badge de media

