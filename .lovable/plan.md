

# Novo Checklist: Informacoes da Festa

## O que e

Um novo modulo de checklist chamado **"Informacoes"** onde o setor Administrativo pode escrever orientacoes e particularidades sobre uma festa para o gerente que vai trabalhar nela. Diferente dos outros checklists que usam itens de marcacao, este usa **blocos de texto** (titulo + conteudo), permitindo adicionar quantos assuntos forem necessarios.

## Como funciona

### Lado Administrativo (aba Checklist > Informacoes)
- Botao "+ Novo Informativo"
- Dialog com:
  - Seletor de festa (opcional, como nos outros)
  - Blocos de informacao: cada bloco tem um **titulo** (ex: "Observacoes sobre o bolo") e um **texto** (ex: "A mae pediu bolo sem gluten, fornecedor X vai entregar as 14h")
  - Botao para adicionar mais blocos
  - Possibilidade de remover blocos
- Card na listagem com: nome da festa, data, quantidade de blocos, acoes (Abrir, Compartilhar, Editar, Excluir)

### Lado Publico (/informacoes/:recordId)
- Pagina somente leitura com informacoes da festa (titulo, data, aniversariante, pais, telefone)
- Lista de blocos de informacao formatados de forma clara
- Design mobile-first, clean

## Detalhes tecnicos

### 1. Nova tabela: `event_info_entries`

Seguindo o padrao das outras tabelas de checklist:

```text
id          uuid (PK, default gen_random_uuid())
company_id  uuid (FK companies, NOT NULL)
event_id    uuid (FK company_events, nullable)
items       jsonb (array de {title: string, content: string})
notes       text (nullable)
filled_by   uuid (nullable)
created_at  timestamptz (default now())
updated_at  timestamptz (default now())
```

RLS habilitado, mesmas policies das outras tabelas de checklist.

### 2. Novo componente: `src/components/agenda/EventInfoManager.tsx`

Seguindo o padrao do `MaintenanceManager.tsx`:
- CRUD completo na tabela `event_info_entries`
- Dialog com seletor de festa + blocos dinamicos (titulo + textarea)
- Cards collapsiveis na listagem com acoes: Abrir, Compartilhar, Editar, Excluir

### 3. Nova pagina publica: `src/pages/PublicEventInfo.tsx`

Seguindo o padrao do `PublicMaintenance.tsx`:
- Busca o registro pelo `recordId`
- Exibe info da festa/evento (titulo, data) no header
- Busca dados do evento vinculado para exibir: nome do aniversariante, pais, telefone (campos do lead associado ao evento)
- Exibe cada bloco de informacao como card com titulo em destaque e texto abaixo
- Somente leitura

### 4. Rota: `src/App.tsx`

Nova rota: `/informacoes/:recordId` apontando para `PublicEventInfo`

### 5. Aba na pagina Formularios: `src/pages/Formularios.tsx`

Adicionar sub-aba **"Informacoes"** dentro da aba Checklist, ao lado de Manutencao, Acompanhamento, Presenca. Icone: `FileText`.

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar tabela `event_info_entries` + RLS |
| `src/components/agenda/EventInfoManager.tsx` | Criar (gerenciador admin) |
| `src/pages/PublicEventInfo.tsx` | Criar (pagina publica read-only) |
| `src/App.tsx` | Adicionar rota `/informacoes/:recordId` |
| `src/pages/Formularios.tsx` | Adicionar aba "Informacoes" no Checklist |
| `src/integrations/supabase/types.ts` | Atualizar tipos da nova tabela |
