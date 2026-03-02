

## Melhorar a planilha CSV de modelo para importacao de contatos

A planilha modelo atual tem cabecalhos tecnicos (ex: `ex_cliente`, `info_festa`, `mes_interesse`), apenas 2 linhas de exemplo e nenhuma numeracao. O objetivo e tornar o template mais amigavel e profissional.

### Mudancas no `CSV_TEMPLATE` em `src/components/campanhas/BaseLeadImportDialog.tsx`

**1. Cabecalhos mais descritivos:**
- `nome` -> `Nome do Contato`
- `telefone` -> `Telefone (com DDD)`
- `ex_cliente` -> `Ex-Cliente? (sim/nao)`
- `info_festa` -> `Info da Festa Anterior`
- `mes_interesse` -> `Mes de Interesse`
- `observacoes` -> `Observacoes`

**2. Mais linhas de exemplo (5 linhas ao inves de 2):**
Adicionar exemplos variados cobrindo diferentes cenarios: ex-cliente com info de festa, lead novo com mes de interesse, lead com observacao, etc.

**3. Coluna de numeracao:**
Adicionar uma primeira coluna `#` com numeros sequenciais (1, 2, 3...) para facilitar a conferencia visual no Excel.

**4. Ajuste no parser:**
Atualizar a funcao `handleFile` para ignorar a primeira coluna (numeracao) ao processar o CSV, garantindo compatibilidade. O parser precisa detectar que a primeira coluna e `#` e fazer o offset dos indices das colunas.

### Detalhes tecnicos

- Arquivo editado: `src/components/campanhas/BaseLeadImportDialog.tsx`
- Atualizar a constante `CSV_TEMPLATE` (linhas 44-46) com os novos cabecalhos, numeracao e 5 linhas de exemplo
- Atualizar `handleFile` (por volta da linha 98) para detectar se a primeira coluna do header e `#` e, nesse caso, descartar a primeira coluna de cada linha antes de processar os campos

