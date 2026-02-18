
## Adicionar aba "Avaliacao" na pagina publica de Equipe/Financeiro

O formulario de avaliacao dos freelancers sera movido para dentro da pagina publica (`/equipe/:recordId`), como uma **segunda aba** ao lado do conteudo atual. Assim, o gerente que acessa o link publico podera tanto preencher dados financeiros quanto avaliar a equipe, sem precisar de acesso a plataforma interna.

### Como vai funcionar

A pagina publica de Equipe/Financeiro passara a ter duas abas:
- **Equipe / Financeiro** (aba atual) - formulario de nomes, PIX e valores
- **Avaliar Equipe** - formulario de avaliacao com estrelas por criterio para cada freelancer listado

O gerente alterna entre as abas livremente. A avaliacao usa os mesmos nomes ja preenchidos no staff_data do registro.

### Detalhes tecnicos

1. **PublicStaff.tsx** - Adicionar componente `Tabs` com duas abas:
   - Tab "Equipe / Financeiro": conteudo atual (formulario de staff)
   - Tab "Avaliar Equipe": formulario de avaliacao inline (estrelas + observacoes por freelancer)

2. **Logica de avaliacao inline** - Extrair a logica do `FreelancerEvaluationDialog.tsx` (criterios, StarRating, load/save) e reutiliza-la diretamente dentro da aba, sem dialog/modal. Os dados serao carregados do Supabase (`freelancer_evaluations`) ao abrir a aba e salvos com upsert usando `event_staff_entry_id + freelancer_name`.

3. **Sem necessidade de autenticacao** - A avaliacao usara o `recordId` para identificar o registro, sem exigir login (igual ao formulario de staff atual). O campo `evaluated_by` ficara como `null` para avaliacoes feitas pelo link publico.

4. **RLS** - Verificar que a tabela `freelancer_evaluations` permite INSERT/UPDATE para o role `anon` (ou ajustar a policy se necessario), ja que o gerente acessa sem estar logado.

5. **Fluxo visual**:
   - Header com titulo e info do evento (compartilhado entre abas)
   - Tabs logo abaixo do header
   - Na aba de avaliacao: lista de freelancers com 5 criterios de estrelas cada + campo de observacoes + botao "Salvar Avaliacoes"
