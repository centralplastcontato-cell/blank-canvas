

## Correcao: Adicionar Opcao 3 (Trabalhe no Castelo) na pergunta do bot

### Problema

O texto da pergunta do step `tipo` nas duas instancias (Manchester e Trujillo) so mostra as opcoes 1 e 2. A opcao 3 ("Trabalhe no Castelo") esta faltando no texto, embora o codigo do webhook ja suporte essa opcao.

### Texto atual (nas duas instancias)

```
Voce ja e nosso cliente e tem uma festa agendada, ou gostaria de receber um orcamento? 🎉

Responda com o *numero*:

*1* - Ja sou cliente
*2* - Quero um orcamento
```

### Texto corrigido

```
Voce ja e nosso cliente e tem uma festa agendada, ou gostaria de receber um orcamento? 🎉

Responda com o *numero*:

*1* - Ja sou cliente
*2* - Quero um orcamento
*3* - Trabalhe no Castelo
```

### Solucao

Executar um UPDATE na tabela `wapi_bot_questions` para as duas instancias, adicionando a opcao 3 no texto da pergunta:

```sql
UPDATE wapi_bot_questions
SET question_text = E'Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:\n\n*1* - Já sou cliente\n*2* - Quero um orçamento\n*3* - Trabalhe no Castelo'
WHERE step = 'tipo'
AND instance_id IN (
  '9b846163-9580-436b-a33e-1e0eca106514',
  '3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7'
);
```

### Impacto

- Apenas atualizacao de dados (2 registros na tabela `wapi_bot_questions`)
- Nenhuma alteracao de codigo -- o webhook ja processa a opcao 3 corretamente
- Nenhum deploy necessario
- Novas conversas ja mostrarao a opcao 3 imediatamente

