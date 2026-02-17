

# Nova Aba "Freelancer" na pagina Operacoes

## O que sera feito

Criar um novo modulo completo de formulario para cadastro de freelancers, seguindo exatamente o mesmo padrao dos formularios existentes (Avaliacoes, Pre-Festa, etc.). Tera uma aba principal "Freelancer" ao lado de Formularios, Checklist e Pacotes, com gerenciamento de templates no admin e uma pagina publica com fluxo passo-a-passo com logo do buffet.

## Pagina publica (como o freelancer vera)

O formulario publico seguira o mesmo layout step-by-step dos outros formularios:

```text
+-----------------------------------+
|  [Logo]  Nome do Buffet           |  <- header com branding
+-----------------------------------+
|  ========= Barra progresso ===    |
|  Etapa 1 de 3                     |
+-----------------------------------+
|                                   |
|  Cadastro de Freelancer           |
|  Preencha seus dados para se      |
|  cadastrar na nossa equipe!       |
|                                   |
|  [Card] Como voce se chama?       |
|  [________________]               |
|                                   |
|  [Card] Telefone                  |
|  [________________]               |
|                                   |
|  [Card] Endereco                  |
|  [________________]               |
|                                   |
+-----------------------------------+
|  [Voltar]            [Proximo ->] |
+-----------------------------------+
```

### Campos do formulario (distribuidos em etapas)

**Etapa 1 - Dados pessoais:**
- Nome completo (texto, obrigatorio)
- Foto (upload de imagem, opcional)
- Telefone (texto com mascara, obrigatorio)
- Endereco (texto, obrigatorio)

**Etapa 2 - Experiencia:**
- Ja trabalha no buffet? (sim/nao)
- Se sim, ha quanto tempo? (texto, condicional)
- Qual funcao? (selecao: Gerente, Seguranca, Garcom, Monitor, Cozinha)

**Etapa 3 - Sobre voce:**
- Fale um pouco sobre voce (textarea)

**Tela final:**
- Mensagem de agradecimento com logo

## Lado administrativo

Na pagina Operacoes (/formularios), uma nova aba principal "Freelancer" com icone `HardHat`. Dentro dela, o gerenciador de templates seguindo o padrao dos outros:

- Botao "+ Novo Template"
- Dialog para criar/editar template (nome, descricao, mensagem de agradecimento, campos personalizaveis)
- Cards com acoes: Link, Ver, Respostas, Editar, Duplicar, Excluir
- Visualizacao inline das respostas recebidas (dados de cada freelancer cadastrado)

## Detalhes tecnicos

### 1. Novas tabelas no banco de dados

**`freelancer_templates`** - armazena os templates de formulario

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | ID unico |
| company_id | uuid FK | Empresa |
| name | text | Nome do template |
| slug | text | Slug para URL amigavel |
| description | text | Descricao exibida no formulario |
| questions | jsonb | Campos configurados |
| thank_you_message | text | Mensagem de agradecimento |
| is_active | boolean | Ativo/inativo |
| created_at | timestamptz | Data criacao |
| updated_at | timestamptz | Data atualizacao |

**`freelancer_responses`** - armazena as respostas dos freelancers

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | ID unico |
| template_id | uuid FK | Template usado |
| company_id | uuid FK | Empresa |
| respondent_name | text | Nome do freelancer |
| answers | jsonb | Respostas (nome, telefone, endereco, funcao, etc.) |
| photo_url | text | URL da foto enviada |
| created_at | timestamptz | Data envio |

RLS: acesso anonimo para insert/select por ID (pagina publica), acesso autenticado com filtro por company para admin.

RPC: `get_freelancer_template_public` e `get_freelancer_template_by_slugs` seguindo o padrao das outras RPCs.

### 2. Novos arquivos

| Arquivo | Descricao |
|---|---|
| `src/pages/FreelancerManager.tsx` | Gerenciador admin (CRUD templates + visualizacao respostas) |
| `src/pages/PublicFreelancer.tsx` | Pagina publica step-by-step |
| Migration SQL | Tabelas + RLS + RPCs |

### 3. Arquivos editados

| Arquivo | Alteracao |
|---|---|
| `src/pages/Formularios.tsx` | Adicionar aba "Freelancer" no nivel principal |
| `src/App.tsx` | Adicionar rotas `/freelancer/:companySlug/:templateSlug` e `/freelancer/:templateId` |

### 4. Upload de foto

O freelancer podera enviar uma foto de perfil. Sera utilizado o bucket `onboarding-uploads` (ja existente e publico) para armazenar as imagens. A foto sera opcional e exibida junto aos dados na visualizacao de respostas pelo admin.

### 5. Rotas publicas

- `/freelancer/:companySlug/:templateSlug` - URL amigavel
- `/freelancer/:templateId` - URL por ID

Ambas resolvidas via RPCs dedicadas, seguindo o padrao existente.

