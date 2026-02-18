
# Sistema de Avaliacao de Freelancers

## Resumo
Implementar um sistema completo para gerentes avaliarem freelancers apos cada festa, com 5 criterios de 1-5 estrelas, armazenamento em tabela dedicada, prevencao de duplicatas, media no autocomplete e historico na aba Freelancer.

## Etapas

### 1. Criar tabela `freelancer_evaluations` no banco
Nova tabela com os seguintes campos:
- `id` (uuid, PK)
- `company_id` (uuid, NOT NULL)
- `event_staff_entry_id` (uuid, nullable, FK para event_staff_entries)
- `event_id` (uuid, nullable)
- `freelancer_name` (text, NOT NULL)
- `freelancer_response_id` (uuid, nullable) -- vinculo automatico ao cadastro
- `evaluated_by` (uuid, nullable)
- `scores` (jsonb, NOT NULL) -- `{"pontualidade":4,"aparencia":5,"proatividade":3,"relacionamento":5,"geral":4}`
- `observations` (text, nullable)
- `created_at` (timestamptz, default now())

Constraint UNIQUE em `(event_staff_entry_id, freelancer_name)` para impedir avaliacao duplicada do mesmo freelancer na mesma festa.

RLS policies seguindo o padrao existente:
- SELECT: usuarios da empresa + admins
- INSERT: usuarios da empresa + admins
- UPDATE: usuarios da empresa + admins
- DELETE: admins da empresa + super admins

### 2. Criar componente `FreelancerEvaluationDialog.tsx`
Novo arquivo: `src/components/agenda/FreelancerEvaluationDialog.tsx`

- Recebe o `EventStaffRecord` como prop
- Lista todos os freelancers com nome preenchido no staff_data
- Para cada freelancer, mostra 5 linhas de estrelas interativas (1-5):
  1. Pontualidade
  2. Aparencia e Uniforme
  3. Proatividade
  4. Relacionamento com Convidados
  5. Avaliacao Geral
- Campo de observacoes por freelancer
- Botao "Salvar Avaliacoes" que faz upsert de todas as avaliacoes
- Match automatico: ao salvar, busca `freelancer_responses` pelo nome para preencher `freelancer_response_id`
- Se ja existe avaliacao para aquele freelancer/evento, carrega os dados para edicao

### 3. Adicionar botao "Avaliar" no EventStaffManager
Modificar `src/components/agenda/EventStaffManager.tsx`:
- Adicionar icone de estrela (Star do Lucide) no header de cada card expandido
- Ao clicar, abre o `FreelancerEvaluationDialog` passando o record
- Mostrar badge visual indicando se a equipe ja foi avaliada

### 4. Mostrar media no FreelancerAutocomplete
Modificar `src/components/agenda/FreelancerAutocomplete.tsx`:
- Criar uma function SQL `get_freelancer_avg_score(name, company_id)` que retorna a media geral
- Alternativa mais simples: ao buscar sugestoes, tambem buscar avaliacoes por nome e calcular media no frontend
- Exibir estrela + media ao lado do nome no dropdown (ex: "Joao Silva ★ 4.2")

### 5. Historico de avaliacoes na aba Freelancer
Criar `src/components/freelancer/FreelancerEvaluationHistory.tsx`:
- Componente que recebe o nome do freelancer e company_id
- Busca todas as avaliacoes daquele freelancer
- Mostra media por criterio (barras ou estrelas)
- Lista cada avaliacao com data e observacoes

Modificar `src/pages/FreelancerManager.tsx`:
- No `FreelancerResponseCards`, adicionar badge com media (estrela + nota) ao lado do nome
- Ao expandir um freelancer, mostrar secao "Avaliacoes" com o historico

## Detalhes Tecnicos

### Estrutura do scores (jsonb)
```json
{
  "pontualidade": 4,
  "aparencia": 5,
  "proatividade": 3,
  "relacionamento": 5,
  "geral": 4
}
```

### Componente de estrelas
Botoes interativos usando icone `Star` do Lucide:
- Vazio: `Star` com stroke
- Preenchido: `Star` com fill amarelo

### Match automatico de freelancer_response_id
Ao salvar avaliacao, executa:
```sql
SELECT id FROM freelancer_responses 
WHERE company_id = $1 AND respondent_name ILIKE $2 
LIMIT 1
```
E preenche o campo automaticamente.

### Media no autocomplete
Ao buscar sugestoes, faz query paralela nas avaliacoes:
```sql
SELECT freelancer_name, AVG((scores->>'geral')::int) as avg_score
FROM freelancer_evaluations
WHERE company_id = $1 AND freelancer_name IN (nomes encontrados)
GROUP BY freelancer_name
```

### Arquivos criados
1. `src/components/agenda/FreelancerEvaluationDialog.tsx`
2. `src/components/freelancer/FreelancerEvaluationHistory.tsx`

### Arquivos modificados
1. `src/components/agenda/EventStaffManager.tsx` -- botao avaliar + import
2. `src/components/agenda/FreelancerAutocomplete.tsx` -- media no dropdown
3. `src/pages/FreelancerManager.tsx` -- badge de media + historico no card expandido

### Migracao SQL
1 migracao criando tabela + constraint UNIQUE + RLS policies
