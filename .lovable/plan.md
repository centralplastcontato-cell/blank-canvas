

## Plano: Remover instância duplicada e corrigir RLS

### Diagnóstico confirmado
- **Instância original** (`ba0a2a17`): 152 conversas, 5.278 mensagens — todos os dados intactos
- **Instância duplicada** (`2921d889`): 0 conversas, 0 mensagens — vazia, criada por engano

As conversas não sumiram — estão todas na instância original. O chat mostra vazio porque está carregando a duplicata.

### Ações

**1. Excluir a instância duplicada (via insert tool)**
Deletar o registro `2921d889-8270-48c8-9a05-a263987b252d` da tabela `wapi_instances`. Como tem 0 dados vinculados, é 100% seguro.

**2. Corrigir política RLS de DELETE (via migração)**
Atualizar a policy de exclusão da tabela `wapi_instances` para permitir que usuários com role `admin` (não apenas `owner`) possam excluir instâncias, evitando esse bloqueio no futuro.

### Resultado
- Apenas 1 instância "Aventura Kids" no sistema
- Todas as 152 conversas e 5.278 mensagens visíveis novamente
- Admins poderão excluir instâncias pela UI normalmente

### Risco: ZERO
A instância duplicada não possui nenhum dado. Nenhuma mensagem será perdida.

