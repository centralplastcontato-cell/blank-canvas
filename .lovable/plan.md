

## Juntar os dois templates "Cadastro de Freelancer" em um so

### Situacao atual
- **Template 1** (mais antigo): 10 perguntas, 15 respostas - nao tem "data de nascimento", foto opcional
- **Template 2** (mais recente): 11 perguntas, 38 respostas - tem "data de nascimento", foto obrigatoria

### O que sera feito

Uma unica migration SQL que:

1. Move as 15 respostas do Template 1 para o Template 2 (UPDATE `freelancer_responses` SET `template_id` = Template 2 WHERE `template_id` = Template 1)
2. Exclui o Template 1

O Template 2 sera mantido como o template definitivo com todas as 53 respostas. As respostas antigas do Template 1 que nao possuem `data_nascimento` simplesmente terao esse campo vazio/nulo nas respostas, o que e normal.

### Nenhuma alteracao de codigo
Apenas uma migration SQL no banco de dados. Nenhum arquivo `.tsx` precisa ser alterado.
