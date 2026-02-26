
## Módulo de Videoaulas / Treinamento

### Visao Geral
Criar um sistema de treinamento com videoaulas, gerenciado pelo Hub e acessivel pelos usuarios dos buffets com controle de permissoes.

### 1. Banco de Dados (Migrations)

**Tabela `training_lessons`**
```text
- id (uuid, PK)
- title (text) — topico da aula
- description (text) — descricao do conteudo
- video_url (text) — URL do video no Storage
- thumbnail_url (text, nullable) — thumbnail opcional
- category (text) — categoria/modulo (ex: "WhatsApp", "CRM", "Agenda")
- sort_order (integer) — ordem de exibicao
- is_published (boolean, default false) — so aparece no buffet quando publicada
- created_by (uuid, FK auth.users)
- created_at, updated_at (timestamps)
```

**Storage Bucket `training-videos`**
- Bucket publico para leitura dos videos
- Upload restrito a usuarios autenticados (Hub admins)

**Permission Definition**
- `treinamento.view` — "Acessar Treinamento" — permite ver as aulas no painel do buffet

### 2. Hub — Pagina de Gestao (`/hub/treinamento`)

**Arquivo: `src/pages/HubTreinamento.tsx`**
- Usa `HubLayout` com `currentPage: "treinamento"`
- Lista todas as aulas em cards com status (rascunho/publicada)
- Botao "Nova Aula" abre dialog com:
  - Campo de titulo (topico)
  - Campo de descricao (textarea)
  - Seletor de categoria
  - Upload de video (direto para o bucket `training-videos`)
  - Toggle publicar/rascunho
- Acoes por card: editar, excluir, publicar/despublicar
- Drag-and-drop para reordenar (usando @dnd-kit ja instalado)

**Atualizacoes necessarias:**
- `HubSidebar.tsx` — adicionar item "Treinamento" com icone `GraduationCap`
- `HubLayout.tsx` — adicionar `"treinamento"` ao tipo `currentPage`
- `HubMobileMenu.tsx` — adicionar item no menu mobile
- `App.tsx` — adicionar rota `/hub/treinamento`

### 3. Buffet — Pagina de Visualizacao (`/treinamento`)

**Arquivo: `src/pages/Treinamento.tsx`**
- Layout com `AdminSidebar` (mesmo padrao das outras paginas do buffet)
- Verifica permissao `treinamento.view`
- Lista apenas aulas com `is_published = true`
- Cards com thumbnail, titulo, descricao e categoria
- Clicar abre o video em um player (dialog ou pagina dedicada)
- Filtro por categoria

**Atualizacoes necessarias:**
- `AdminSidebar.tsx` — adicionar item "Treinamento" (condicionado ao modulo/permissao)
- `MobileMenu.tsx` — adicionar item no menu mobile
- `App.tsx` — adicionar rota `/treinamento`

### 4. Permissoes e Modulos

**Migration de permissoes:**
```text
INSERT INTO permission_definitions (code, name, description, category, sort_order, is_active)
VALUES ('treinamento.view', 'Acessar Treinamento', 'Permite visualizar as videoaulas de treinamento', 'Sistema', 90, true);
```

**RLS Policies na tabela `training_lessons`:**
- SELECT: usuarios autenticados podem ler aulas publicadas de sua empresa (via is_admin ou permissao)
- INSERT/UPDATE/DELETE: apenas admins (via `is_admin` function)

### 5. Fluxo de Uso

```text
Hub Admin                          Buffet User
    |                                    |
    |-- Acessa /hub/treinamento          |
    |-- Clica "Nova Aula"               |
    |-- Preenche titulo + descricao      |
    |-- Faz upload do video              |
    |-- Marca como "Publicada"           |
    |                                    |
    |                              Acessa /treinamento
    |                              Ve aulas publicadas
    |                              Clica para assistir
```

### 6. Arquivos a Criar
- `src/pages/HubTreinamento.tsx` — gestao de aulas (Hub)
- `src/pages/Treinamento.tsx` — visualizacao de aulas (Buffet)
- Migration SQL — tabela, bucket, RLS, permissoes

### 7. Arquivos a Editar
- `src/App.tsx` — rotas `/hub/treinamento` e `/treinamento`
- `src/components/hub/HubSidebar.tsx` — item no menu Hub
- `src/components/hub/HubLayout.tsx` — tipo `currentPage`
- `src/components/hub/HubMobileMenu.tsx` — item no menu mobile Hub
- `src/components/admin/AdminSidebar.tsx` — item no menu Buffet
- `src/components/admin/MobileMenu.tsx` — item no menu mobile Buffet
