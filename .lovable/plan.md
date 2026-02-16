

## Reorganizacao das Abas de Configuracoes

### Problema
Existem 10 abas no topo da pagina de Configuracoes, o que causa scroll excessivo em telas menores e dificulta a navegacao. Algumas abas tratam de assuntos muito relacionados e compartilham a mesma permissao.

### Proposta: de 10 abas para 7

Consolidar abas com funcionalidades sobrepostas usando sub-abas internas:

| Antes (10 abas) | Depois (7 abas) |
|---|---|
| Conexao | **Conexao** (sem mudanca) |
| Mensagens | **Conteudo** (sub-abas: Templates, Materiais) |
| Materiais | _(dentro de Conteudo)_ |
| Notificacoes | **Notificacoes** (sem mudanca) |
| Automacoes | **Automacoes** (sub-abas: Geral/Perguntas/..., + Fluxos) |
| Fluxos | _(dentro de Automacoes)_ |
| Avancado | **Avancado** (inclui secao Importar Dados) |
| Importar Dados | _(dentro de Avancado)_ |
| Checklist | **Checklist** (mantido separado por ser de Agenda) |
| Guia Visual | **Guia Visual** (sem mudanca) |

### Detalhes Tecnicos

#### 1. Criar aba "Conteudo" (fusao Mensagens + Materiais)
- **Arquivo**: `WhatsAppConfig.tsx` -- substituir as duas entradas (`messages` e `materials`) por uma unica `content`
- **Icone**: `MessageSquare` ou `FolderOpen`
- **Renderizacao**: novo componente `ContentSection.tsx` que renderiza sub-abas internas (usando `Tabs` do Radix):
  - Sub-aba "Templates" -- renderiza o conteudo atual de `MessagesSection`
  - Sub-aba "Materiais" -- renderiza o conteudo atual de `SalesMaterialsSection`
- Permissao: `messages` (ja compartilhada)

#### 2. Mover "Fluxos" para dentro de "Automacoes"
- **Arquivo**: `AutomationsSection.tsx` -- ja possui sub-abas internas (Geral, Perguntas, Mensagens, Follow-ups, VIP, Jornada)
- Adicionar uma nova sub-aba "Fluxos" que renderiza `FlowListManager`
- Condicionar a visibilidade da sub-aba ao modulo `flow_builder` estar habilitado
- Remover a entrada `flows` do array `allConfigSections` em `WhatsAppConfig.tsx`

#### 3. Mover "Importar Dados" para dentro de "Avancado"
- **Arquivo**: `AdvancedSection.tsx` -- adicionar o `DataImportSection` como um Card adicional no final da secao (ou como sub-aba se preferir)
- Remover a entrada `import` do array `allConfigSections` em `WhatsAppConfig.tsx`

#### 4. Atualizar array de secoes
- **Arquivo**: `WhatsAppConfig.tsx`
  - Remover entradas: `messages`, `materials`, `flows`, `import`
  - Adicionar entrada: `content` (com permissao `messages`, modulo `messages`)
  - Atualizar o `renderContent()` para o novo case `content`

### Arquivos Afetados
- `src/components/whatsapp/WhatsAppConfig.tsx` -- array de secoes e renderContent
- `src/components/whatsapp/settings/AutomationsSection.tsx` -- adicionar sub-aba Fluxos
- `src/components/whatsapp/settings/AdvancedSection.tsx` -- adicionar secao Importar Dados
- Novo arquivo: `src/components/whatsapp/settings/ContentSection.tsx` -- wrapper com sub-abas Templates + Materiais

### Resultado
- Reducao de 10 para 7 abas no nivel superior
- Melhor usabilidade em telas menores (menos scroll horizontal)
- Agrupamento logico mantendo as mesmas permissoes
- Nenhuma funcionalidade removida, apenas reorganizada

