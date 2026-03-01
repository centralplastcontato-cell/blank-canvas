

# Corrigir: Perguntas do bot invisíveis e impossíveis de criar/restaurar

## Problema Real

O erro **não é apenas** a ordem de delete/insert. O problema principal é que a coluna `company_id` está **NULL** em todas as perguntas existentes, e o código **nunca inclui** `company_id` ao inserir perguntas.

A política de segurança (RLS) da tabela `wapi_bot_questions` exige que `company_id` esteja preenchido e pertença às empresas do usuário. Resultado:

- **SELECT falha silenciosamente** -- retorna 0 registros (as perguntas existem no banco, mas o usuário não consegue vê-las)
- **INSERT falha** -- a política `WITH CHECK` rejeita registros sem `company_id`
- Por isso aparece "Nenhuma pergunta configurada" e "Erro ao restaurar"

## Solução (2 partes)

### Parte 1: Corrigir os dados existentes no banco

Atualizar todos os registros de `wapi_bot_questions` que têm `company_id = NULL`, preenchendo com o `company_id` correto da respectiva instância (`wapi_instances`).

```sql
UPDATE wapi_bot_questions q
SET company_id = i.company_id
FROM wapi_instances i
WHERE q.instance_id = i.id
  AND q.company_id IS NULL;
```

### Parte 2: Corrigir o código para sempre incluir `company_id`

**Arquivo**: `src/components/whatsapp/settings/AutomationsSection.tsx`

Adicionar `company_id: currentCompanyId` em **3 locais**:

1. **`fetchBotQuestions`** (auto-populate, ~linha 441): ao inserir perguntas padrão automaticamente quando nenhuma existe
2. **`resetQuestions`** (~linha 582): ao inserir perguntas padrão no reset
3. **`saveQuestions`** (~linha 545): garantir que perguntas salvas mantenham o `company_id`

Em cada insert, o objeto passará a incluir:
```typescript
{
  ...q,
  instance_id: selectedInstance.id,
  company_id: currentCompanyId,  // NOVO
  is_active: true,
}
```

## Resultado esperado

- As perguntas existentes voltarão a aparecer imediatamente (Parte 1)
- Novas inserções e resets funcionarão sem erro de RLS (Parte 2)
- O Aventura Kids conseguirá acessar e editar suas perguntas normalmente

