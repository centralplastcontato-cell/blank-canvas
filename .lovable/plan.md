

## Reformatar seção do aniversariante e pais no template de contrato

### O que muda

Atualmente, os dados do aniversariante e dos pais estão cada um em uma linha separada no template padrão:

```
Aniversariante: Noah
Idade a comemorar: 04 anos
Data Nascimento: 03081990
Data do Evento: 25/04/2026
...
Nome dos pais: Karina (Mãe) e Emerson (Pai)
Telefone dos pais: 15997575586
Denominada CONTRATANTE.
```

O objetivo é transformar isso em um **texto corrido em negrito**, fluindo naturalmente como um parágrafo, diferenciando visualmente do restante do contrato.

### Resultado esperado

O bloco passará a ser renderizado assim (tudo em negrito, texto corrido):

> **Aniversariante: Noah, Idade a comemorar: 04 anos, Data Nascimento: 03081990, Data do Evento: 25/04/2026, Data do Contrato: 23/03/2026, Pacote escolhido: CASTELO PREMIUM, Tema: , Nome dos pais: Karina (Mãe) e Emerson (Pai), Telefone dos pais: 15997575586, Denominada CONTRATANTE.**

### Arquivos alterados

1. **`src/components/contracts/ContractModelEditor.tsx`** (linhas 283-292 do `DEFAULT_TEMPLATE`)
   - Unir as linhas do aniversariante/pais em uma única linha contínua separada por ` | ` ou vírgulas
   - Envolver o bloco com marcadores de negrito (ex: `**...**` ou tag customizada)

2. **`src/components/contracts/ContractDocumentViewer.tsx`** (renderização do conteúdo)
   - No viewer (tela + impressão), detectar os marcadores de negrito e renderizar com `<strong>` / `font-weight: bold`
   - Aplicar tanto na div de preview quanto no HTML de impressão (`handlePrint`)

### Detalhes técnicos

- **Marcador**: Usar `**texto**` (estilo markdown) no template, já que o conteúdo é plain text
- **Parser**: Adicionar uma função simples que converte `**...**` em `<strong>...</strong>` antes de renderizar
- **Preview na tela**: Trocar o render de `{content}` (texto puro) por `dangerouslySetInnerHTML` com o conteúdo processado (ou usar regex + React fragments com `<strong>`)
- **Impressão**: Aplicar a mesma conversão no HTML do `handlePrint`
- **Template padrão reformatado**: A seção ficará como uma linha só:
  ```
  **Aniversariante: {{nome_aniversariante}}, Idade a comemorar: {{idade_aniversariante}}, Data Nascimento: {{data_nascimento}}, Data do Evento: {{data_evento}}, Data do Contrato: {{data_contrato}}, Pacote escolhido: {{pacote}}, Tema: {{tema}}, Nome dos pais: {{nomes_pais}}, Telefone dos pais: {{telefone}}, Denominada CONTRATANTE.**
  ```

