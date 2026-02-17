

# Adicionar campo PIX no cadastro de Freelancer e integrar com Equipe Financeiro

## Resumo

Adicionar dois novos campos nos templates default de freelancer -- **Tipo PIX** (select) e **Chave PIX** (texto) -- e, no modulo de Equipe da Agenda, ao adicionar um nome na lista de pagamento, sugerir freelancers cadastrados com auto-complete, preenchendo automaticamente o nome e a chave PIX.

## O que muda para o freelancer (formulario publico)

No template padrao, duas novas perguntas aparecerao na etapa de dados pessoais:
- **Tipo de chave PIX** (selecao unica: CPF, CNPJ, E-mail, Telefone, Chave aleatoria)
- **Chave PIX** (campo texto)

Como o sistema ja e totalmente dinamico, nenhuma mudanca estrutural e necessaria no formulario publico (`PublicFreelancer.tsx`) -- basta incluir as perguntas no array de defaults.

## O que muda para o admin (Equipe Financeiro)

No componente `EventStaffManager.tsx`, ao digitar o nome de um freelancer no campo "Nome", aparecera uma lista de sugestoes vindas da tabela `freelancer_responses` da mesma empresa. Ao selecionar um freelancer:
- O campo **nome** e preenchido automaticamente
- O campo **tipo PIX** e preenchido automaticamente
- O campo **chave PIX** e preenchido automaticamente

O admin ainda pode editar os dados manualmente depois.

## Detalhes tecnicos

### 1. Coluna `pix_type` e `pix_key` na tabela `freelancer_responses`

Adicionar duas colunas dedicadas na tabela `freelancer_responses` para facilitar a consulta sem precisar parsear o JSONB:

| Coluna | Tipo | Default |
|---|---|---|
| pix_type | text | null |
| pix_key | text | null |

Esses campos serao preenchidos automaticamente a partir do JSONB de answers no momento do submit, usando um trigger ou diretamente no codigo do frontend.

**Abordagem escolhida**: extrair no frontend no momento do submit (mais simples, sem trigger). O `PublicFreelancer.tsx` ja monta o array de answers -- basta identificar as perguntas cujo ID contem "pix_type" e "pix_key" e gravar nas colunas dedicadas.

### 2. Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `src/pages/FreelancerManager.tsx` | Adicionar "pix_type" e "pix_key" ao array `DEFAULT_QUESTIONS` |
| `src/pages/PublicFreelancer.tsx` | Ao submeter, extrair pix_type e pix_key do answers e gravar nas colunas dedicadas |
| `src/components/agenda/EventStaffManager.tsx` | Adicionar autocomplete no campo nome que busca freelancers cadastrados e preenche PIX automaticamente |
| Migration SQL | Adicionar colunas `pix_type` e `pix_key` na tabela `freelancer_responses` |

### 3. Autocomplete no EventStaffManager

- Ao focar/digitar no campo "Nome" de qualquer entrada de staff, fazer uma query em `freelancer_responses` filtrando por `company_id` e `respondent_name ilike '%texto%'`
- Exibir um dropdown simples com nome + chave PIX
- Ao clicar, preencher os 3 campos (name, pix_type, pix_key)
- Usar debounce de 300ms para evitar queries excessivas

### 4. Perguntas default atualizadas

Duas novas perguntas serao adicionadas ao array `DEFAULT_QUESTIONS` na etapa 1:

```text
{ id: "pix_tipo", type: "select", text: "Tipo de chave PIX", step: 1,
  options: ["CPF", "CNPJ", "E-mail", "Telefone", "Chave aleatoria"] }
{ id: "pix_chave", type: "text", text: "Chave PIX", step: 1 }
```

Templates ja existentes nao serao afetados -- o admin pode adicionar esses campos manualmente se quiser. Apenas novos templates terao os campos PIX por padrao.

