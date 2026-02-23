

# Renomear "Slug" para linguagem amigavel

## O que muda

No componente `CompanyDataSection.tsx`, trocar o label tecnico "Slug" por um nome que o usuario leigo entenda.

## Detalhes Tecnicos

### Arquivo: `src/components/whatsapp/settings/CompanyDataSection.tsx`

Substituir o bloco do campo Slug (linhas ~121-130):

**De:**
- Label: "Slug"
- Descricao: "Identificador unico -- nao editavel."

**Para:**
- Label: "Endereco da Pagina"
- Descricao: "Esse e o nome usado no link da sua pagina. Ex: celebrei.com/planeta-divertido"
- Adicionar um preview visual do link completo abaixo do input, algo como:
  `celebrei.com/planeta-divertido` em texto menor e estilizado

### Arquivo: `src/components/admin/CompanyFormDialog.tsx`

Tambem renomear o label "Slug" neste formulario (usado no Hub para criar/editar empresas):

**De:**
- Label: "Slug" com helper `/auth/{slug}`

**Para:**
- Label: "Endereco da Pagina"
- Helper: "Usado no link: celebrei.com/{valor}"

## Resultado

O usuario entende imediatamente que aquele campo e o "nome do link" da pagina dele, sem precisar saber o que e um slug.

