

## Problema Identificado

A tabela `freelancer_responses` **nao tem politica de UPDATE (RLS)**. Isso significa que quando o sistema tenta atualizar o `approval_status` para "aprovado" ou "rejeitado", o banco de dados simplesmente ignora a operacao sem retornar erro visivel. O status nunca muda no banco.

## Solucao

### 1. Criar politica RLS de UPDATE para `freelancer_responses`

Adicionar uma politica que permita que admins e membros da empresa atualizem os registros:

```sql
CREATE POLICY "Company admins can update freelancer responses"
  ON freelancer_responses FOR UPDATE
  USING (
    is_admin(auth.uid()) OR (
      company_id = ANY(get_user_company_ids(auth.uid()))
      AND EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = auth.uid()
        AND uc.company_id = freelancer_responses.company_id
        AND uc.role = ANY(ARRAY['owner','admin'])
      )
    )
  );
```

### 2. Melhorar o tratamento de erro no `handleApproval`

Atualmente o codigo usa `as any` no `.update()`, o que pode mascarar erros. Apos criar a politica, tambem vou melhorar a verificacao de resultado do update para garantir que a atualizacao realmente aconteceu (verificando `count` ou `data` retornado).

### Detalhes Tecnicos

- **Arquivo alterado**: `src/pages/FreelancerManager.tsx` (tratamento de erro)
- **Migracao SQL**: Nova politica RLS de UPDATE na tabela `freelancer_responses`
- **Impacto**: Apenas admins/owners da empresa poderao atualizar status de aprovacao, mantendo a seguranca

