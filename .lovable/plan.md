

## Alterar status do freelancer Victor para "pendente"

### Objetivo
Atualizar o campo `approval_status` do registro do freelancer **Victor** (id: `31891e12-37b0-4e3e-80f5-7dab73ccf99c`) de `rejeitado` para `pendente`, permitindo testar o fluxo de aprovacao com selecao de unidade.

### O que sera feito
1. Criar uma migration SQL que executa:
```sql
UPDATE freelancer_responses 
SET approval_status = 'pendente' 
WHERE id = '31891e12-37b0-4e3e-80f5-7dab73ccf99c';
```

### Resultado esperado
Apos a alteracao, ao clicar em **Aprovar** no card do Victor na tela de Formularios > Freelancer, o sistema devera exibir o dialogo de selecao de unidade (UnitSelectDialog) perguntando por qual numero enviar a mensagem, ja que a empresa possui 2 instancias conectadas (Manchester e Trujillo).

### Secao tecnica
- Tabela: `freelancer_responses`
- Coluna: `approval_status` (CHECK constraint aceita: pendente, aprovado, rejeitado)
- Nenhuma alteracao de codigo necessaria -- apenas dado no banco
