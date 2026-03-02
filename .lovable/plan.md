
## Exibir cargo do freelancer na escala mesmo quando status nao e "aprovado"

### Problema
A funcao de exibir o cargo do freelancer na escala ja existe no codigo, porem nao esta funcionando por dois motivos:

1. **Filtro muito restritivo**: O codigo busca apenas freelancers com `approval_status = "aprovado"`, mas a Jamile (e possivelmente outros) esta com status `"pendente"`. Como o cargo e cadastrado no momento da inscricao, a informacao ja existe no banco.

2. **Espacos no nome**: O `respondent_name` no banco tem espaco extra ("Jamile ") enquanto o `freelancer_name` na disponibilidade e "Jamile" (sem espaco). A comparacao exata falha.

### Solucao

**Arquivo: `src/components/freelancer/FreelancerSchedulesTab.tsx`**

Na funcao `loadScheduleDetails`, alterar a query de busca de roles (linhas ~172-193):

1. Remover o filtro `.eq("approval_status", "aprovado")` -- buscar o cargo independente do status de aprovacao
2. Usar `TRIM()` nos nomes para evitar falhas por espacos extras -- como o Supabase JS nao tem `trim` nativo, aplicar `.trim()` no JavaScript ao comparar os nomes

```text
Antes:
  .eq("approval_status", "aprovado")
  .in("respondent_name", uniqueNames)

Depois:
  .in("respondent_name", uniqueNames)  // sem filtro de aprovacao
  // + trim nos nomes ao montar o rolesMap
```

### Resultado
- O cargo cadastrado pelo freelancer (ex: "Gerente" para Jamile) aparecera abaixo do nome na lista de disponibilidade
- A funcao de auto-preenchimento de cargo ao escalar tambem funcionara
- Nenhuma mudanca visual -- a UI ja suporta a exibicao, so faltava o dado chegar
