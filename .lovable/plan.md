

# Adicionar foto ao formulário de recrutamento comercial

## O que será feito

Adicionar um campo de upload de foto na primeira etapa (Informações Básicas) do formulário de recrutamento. A foto será armazenada no Supabase Storage e a URL salva junto com a resposta na tabela `hub_recruitment_responses`.

## Mudanças

### 1. Banco de dados
- Adicionar coluna `photo_url TEXT` na tabela `hub_recruitment_responses`

### 2. Storage
- Criar bucket `recruitment-photos` (público) para armazenar as fotos
- Política RLS permitindo INSERT anônimo (formulário público) e SELECT para todos

### 3. Formulário público (`PublicRecruitmentForm.tsx`)
- Adicionar estado para `photoFile` e `photoPreview`
- Na seção 0 (Informações Básicas), incluir campo de upload de foto com preview circular
- No `handleSubmit`, fazer upload da foto para o bucket antes de inserir no banco
- Salvar a `photo_url` no registro
- Validação: foto obrigatória para prosseguir da etapa 0

### 4. Painel de respostas (`HubRecruitment.tsx`)
- Exibir miniatura da foto na tabela de respostas (avatar ao lado do nome)
- Exibir foto maior no Sheet de detalhes

## Fluxo
1. Monitor abre o formulário e na primeira etapa vê o campo "Sua foto"
2. Tira/seleciona uma foto (aceita JPG, PNG, WebP)
3. Preview circular aparece no formulário
4. No envio, foto é salva no bucket e URL persistida no banco
5. Admin vê a foto do candidato na listagem e nos detalhes

