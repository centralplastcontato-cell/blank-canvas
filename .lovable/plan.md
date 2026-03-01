

## Importacao de Leads de Base via CSV

### Resumo
Criar um dialog de importacao CSV na aba "Leads de Base" que permite ao usuario baixar um modelo de planilha, preencher com seus contatos e enviar de volta ao sistema para cadastro em lote.

### Fluxo do usuario
1. Clica no botao "Importar" (ao lado de "Adicionar Contato")
2. Abre um dialog com botao para baixar o modelo CSV
3. Preenche a planilha no Excel/Google Sheets
4. Faz upload do arquivo preenchido
5. Ve a pre-visualizacao: quantos validos, erros e duplicatas
6. Confirma e os contatos sao inseridos em lote

### Arquivos envolvidos

**Novo arquivo: `src/components/campanhas/BaseLeadImportDialog.tsx`**

Dialog com duas etapas:
- **Etapa 1 (Upload)**: Botao para baixar template CSV + area de upload de arquivo
- **Etapa 2 (Confirmacao)**: Tabela de pre-visualizacao com contadores (validos, erros, duplicatas) + botao de confirmar

Logica interna:
- Parse do CSV no frontend (sem biblioteca externa) - detecta separador `;` ou `,` automaticamente
- Validacao por linha: nome obrigatorio (min 2 chars), telefone com 10-11 digitos
- Normalizacao do telefone: remove formatacao, aceita com ou sem DDI (55), armazena apenas DDD+numero
- Campo `ex_cliente`: aceita "sim"/"s"/"yes"/"1" como true, qualquer outro valor como false
- Consulta `base_leads` existentes da empresa para detectar duplicatas por telefone
- Insercao em batches de 50 registros via Supabase
- Barra de progresso durante a importacao
- Resumo final: X importados, Y duplicatas ignoradas, Z com erro

Template CSV gerado:
```text
nome;telefone;ex_cliente;info_festa;mes_interesse;observacoes
Maria Silva;11999887766;sim;Marco 2024;;Indicacao da Ana
Joao Santos;11988776655;nao;;Junho;Viu no Instagram
```

**Arquivo editado: `src/components/campanhas/BaseLeadsTab.tsx`**

- Adicionar botao "Importar" (icone `Upload`) ao lado do botao "Adicionar Contato"
- State `importOpen` para controlar o dialog
- Renderizar `BaseLeadImportDialog` passando `companyId` e `onImported={loadLeads}`

### Detalhes tecnicos

**Parse do CSV:**
- Dividir texto por `\n`, ignorar linhas vazias
- Primeira linha = header (ignorada)
- Detectar separador: se header contem `;` usa `;`, senao usa `,`
- Cada campo e trimado; aspas duplas envolventes sao removidas

**Validacao:**
- `nome`: obrigatorio, min 2 caracteres, max 100
- `telefone`: obrigatorio, somente digitos apos limpeza, 10 ou 11 digitos
- Se telefone comecar com "55" e tiver 12-13 digitos, remove o "55" para armazenar apenas DDD+numero
- `ex_cliente`: normalizado para boolean
- `info_festa`: max 100 chars
- `mes_interesse`: validado contra lista de meses conhecidos (aceita lowercase)
- `observacoes`: max 500 chars

**Deteccao de duplicatas:**
- Busca todos os telefones existentes em `base_leads` para o `company_id`
- Compara o telefone normalizado de cada linha do CSV contra os existentes

**Insercao em lote:**
- Batches de 50 registros usando `supabase.from('base_leads').insert(batch)`
- `created_by` obtido via `supabase.auth.getUser()`
- Progress bar atualizada a cada batch

**Estilo visual:**
- Segue o mesmo padrao premium do `BaseLeadFormDialog` (glassmorphism, rounded-2xl, gradiente no header)
- Icones e badges coloridos para status de validacao (verde = valido, vermelho = erro, amarelo = duplicata)

### Nenhuma alteracao no banco de dados
A tabela `base_leads` ja possui todos os campos necessarios. Nao e preciso criar migration.

