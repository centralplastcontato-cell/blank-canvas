

# Checklist Financeiro -- Equipe da Festa

## Resumo

Criar um modulo de **Equipe Financeiro** dentro da aba **Checklist** (em Documentos), onde o gerente da festa preenche a lista de freelancers com dados de PIX para enviar ao financeiro. O formulario fica vinculado a um evento do calendario.

## O que muda para o usuario

- Na aba **Checklist** (Documentos), alem dos templates de tarefas, aparece uma nova secao: **"Equipe / Financeiro"**
- O gerente clica em "Nova Equipe", seleciona a **festa do calendario**, e preenche os freelancers
- Cada funcao (Gerente de Festa, Garcom, Cozinha, Monitor, Seguranca) ja vem pre-configurada com a quantidade padrao
- Para cada vaga, preenche: **Nome**, **Tipo de PIX** (CPF, CNPJ, E-mail, Telefone, Chave aleatoria), **Chave PIX**, **Valor (R$)**
- O financeiro pode visualizar todos os registros organizados por festa
- Pode exportar/copiar os dados para repassar ao financeiro

## Fluxo do usuario

1. Acessa **Documentos > Checklist**
2. Vê duas sub-secoes: "Templates de Tarefas" (existente) e "Equipe Financeiro" (novo)
3. Clica em **"Nova Equipe"**
4. Seleciona a **festa** (dropdown com festas do calendario)
5. Aparece a lista de funcoes pre-configuradas com N campos cada
6. Preenche nome, PIX e valor de cada freelancer
7. Salva -- fica vinculado ao evento
8. Pode editar, visualizar e excluir depois

## Detalhes Tecnicos

### 1. Banco de Dados -- Nova tabela

**Tabela `event_staff_entries`:**

```text
id              uuid PK DEFAULT gen_random_uuid()
event_id        uuid NOT NULL (referencia company_events)
company_id      uuid NOT NULL
filled_by       uuid (usuario que preencheu)
staff_data      jsonb NOT NULL DEFAULT '[]'
  -- Array de { roleTitle, entries: [{ name, pix_type, pix_key, value }] }
notes           text
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

**RLS:** Mesmas politicas das tabelas operacionais -- SELECT/INSERT/UPDATE/DELETE para membros da empresa.

### 2. Tabela de configuracao de funcoes padrao

**Tabela `staff_role_templates`:**

```text
id              uuid PK DEFAULT gen_random_uuid()
company_id      uuid NOT NULL
roles           jsonb NOT NULL DEFAULT '[]'
  -- Array de { title, default_quantity }
  -- Padrao: [
  --   { "title": "Gerente de Festa", "default_quantity": 1 },
  --   { "title": "Garçom", "default_quantity": 2 },
  --   { "title": "Cozinha", "default_quantity": 2 },
  --   { "title": "Monitor", "default_quantity": 7 },
  --   { "title": "Segurança", "default_quantity": 1 }
  -- ]
created_at      timestamptz DEFAULT now()
```

### 3. Novo componente: `EventStaffManager.tsx`

- Listagem de registros por festa (cards expansiveis, mesmo padrao dos formularios)
- Dialog para criar/editar com:
  - Select de evento (usando RPC `get_company_events_for_cardapio` que ja existe)
  - Para cada funcao, N linhas com inputs: Nome, Tipo PIX (select), Chave PIX, Valor
  - Botao de adicionar/remover vagas por funcao
- Botao para copiar resumo em texto (para enviar no WhatsApp ao financeiro)

### 4. Integrar na aba Checklist

- Em `Formularios.tsx`, dentro do `TabsContent value="checklist"`, renderizar ambos:
  - `ChecklistTemplateManager` (existente)
  - `EventStaffManager` (novo)
- Separados por um Separator com titulo

### 5. Arquivos a criar
- `src/components/agenda/EventStaffManager.tsx` -- componente principal
- Migracao SQL -- tabelas + RLS

### 6. Arquivos a editar
- `src/pages/Formularios.tsx` -- adicionar EventStaffManager na aba Checklist

