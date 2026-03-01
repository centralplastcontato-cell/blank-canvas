
## Melhorar visual e texto do dialog de importacao CSV

O usuario relata que o dialog de importacao ainda nao esta claro o suficiente sobre o que o download faz. A mudanca principal e tornar o texto mais explicito e o botao de download mais destacado visualmente.

### Alteracoes em `src/components/campanhas/BaseLeadImportDialog.tsx`

**Step 1 - Download do template:**
- Trocar o titulo de "Baixe o modelo de planilha" para **"Baixe a planilha modelo para cadastrar seus contatos"**
- Reescrever a descricao para ser mais clara: **"Este arquivo e uma planilha pronta com todas as colunas necessarias para voce cadastrar seus contatos em massa. Baixe, preencha com os dados dos seus contatos no Excel ou Google Sheets, e depois envie aqui."**
- Tornar o botao de download maior e mais visivel: usar `size="default"` em vez de `size="sm"`, com variante primaria (ja esta) e texto mais descritivo: **"Baixar planilha de cadastro (.csv)"**
- Adicionar um icone de `FileSpreadsheet` ao lado do titulo do passo 1 para reforcar visualmente que se trata de uma planilha

**Step 2 - Upload:**
- Trocar titulo para **"Envie a planilha preenchida com seus contatos"**
- Manter o restante igual

### Detalhes tecnicos

Arquivo unico editado: `src/components/campanhas/BaseLeadImportDialog.tsx`, linhas 231-274.

- Linha 235: atualizar texto do titulo
- Linha 237-238: reescrever descricao
- Linha 245-248: aumentar botao e trocar label
- Linha 256: atualizar titulo do passo 2
