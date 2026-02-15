

## Adicionar campo de feedback do usuario no Resumo do Dia

### O que muda para o usuario
Abaixo do "Insight da IA", aparece uma nova secao "Observacao do Time" onde qualquer usuario pode escrever um comentario sobre o dia (ex: "Sabado - atendimento so ate meio-dia"). O texto fica salvo permanentemente junto com os dados do dia e visivel para toda a equipe, inclusive ao consultar datas passadas.

### Etapas

1. **Adicionar coluna no banco de dados**
   - Nova coluna `user_note` (tipo `text`, nullable) na tabela `daily_summaries`

2. **Criar secao de feedback no componente (`ResumoDiarioTab.tsx`)**
   - Nova secao "Observacao do Time" com um `textarea` e botao "Salvar"
   - Posicionada entre o card de "Insight da IA" e a "Timeline do Dia"
   - Quando ja existe uma nota salva, exibe o texto com opcao de editar
   - Feedback visual (toast) ao salvar com sucesso

3. **Salvar/carregar a nota via Supabase**
   - Ao salvar, faz `upsert` direto na tabela `daily_summaries` pelo client (sem precisar de edge function)
   - A nota e carregada junto com os dados historicos pela edge function `daily-summary` (adicionar `user_note` no select de dados historicos e no retorno)

4. **Atualizar a edge function `daily-summary`**
   - Incluir `user_note` no select quando busca dados historicos
   - Incluir `user_note` no retorno do JSON
   - Nao sobrescrever `user_note` no upsert de persistencia (preservar o que o usuario escreveu)

### Detalhes tecnicos

**Migracao SQL:**
```sql
ALTER TABLE daily_summaries ADD COLUMN user_note text;
```

**`ResumoDiarioTab.tsx`:**
- Novo state `userNote` e `isEditingNote`
- Textarea com max 500 caracteres
- Salvar via `supabase.from('daily_summaries').upsert({ company_id, summary_date, user_note }, { onConflict: 'company_id,summary_date' })`
- Carregar `user_note` do `data` retornado pelo hook

**`daily-summary/index.ts`:**
- No bloco de dados historicos (linha ~89): adicionar `user_note` ao `.select()`
- No retorno historico: incluir `user_note`
- No retorno live: incluir `user_note: null` (ou buscar se ja existir)
- No upsert de persistencia: nao incluir `user_note` para nao sobrescrever

**`useDailySummary.ts`:**
- Adicionar `userNote?: string | null` ao tipo `DailySummaryData`
