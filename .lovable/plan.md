

## Nova Aba "Manutencao" no Checklist

### Resumo
Criar um modulo de **Manutencao** dentro da aba Checklist em Operacoes, seguindo exatamente o mesmo padrao do modulo "Equipe Financeiro". O admin cria o registro com itens de manutencao pre-definidos, compartilha o link publico, e o gerente da festa preenche os problemas encontrados e anexa a festa.

### Fluxo do usuario
1. Admin acessa Operacoes > Checklist > aba "Manutencao"
2. Clica em "Nova Manutencao" -- salva registro com checklist de situacoes padrao (sem obrigar festa)
3. Copia o link publico e envia ao gerente via WhatsApp
4. Gerente abre o link no celular, ve a lista de situacoes de manutencao com checkbox
5. Marca as situacoes encontradas, escreve observacoes no campo de texto
6. Seleciona a festa (se nao foi pre-vinculada)
7. Clica em "Enviar"

### Itens padrao do checklist de manutencao
- Lampada queimada
- Ar-condicionado com defeito
- Vazamento de agua
- Tomada sem funcionar
- Brinquedo quebrado
- Porta/fechadura com problema
- Piso danificado
- Infiltracao/umidade
- Equipamento de som com defeito
- Outro (campo livre)

### Mudancas tecnicas

#### 1. Migration SQL -- nova tabela `maintenance_entries`
```text
Colunas:
- id (uuid, PK, default gen_random_uuid())
- company_id (uuid, NOT NULL, FK companies)
- event_id (uuid, NULLABLE, FK company_events)
- items (jsonb, NOT NULL, default '[]') -- array de { label: string, checked: boolean, detail?: string }
- notes (text, NULLABLE) -- campo de observacoes gerais
- filled_by (uuid, NULLABLE)
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())
```

RLS policies (mesmo padrao do `event_staff_entries`):
- SELECT/UPDATE para `anon` com `USING (true)` (acesso publico por ID)
- INSERT para usuarios autenticados da empresa
- DELETE para admins da empresa
- SELECT/UPDATE para usuarios autenticados da empresa

#### 2. Novo componente: `src/components/agenda/MaintenanceManager.tsx`
- Segue o mesmo padrao do `EventStaffManager.tsx`
- Lista registros da empresa com cards colapsaveis
- Dialog para criar/editar com os itens de manutencao padrao (checkboxes)
- Cada item pode ser marcado e ter um campo de detalhe opcional
- Campo de observacoes gerais na parte inferior
- Seletor de festa opcional (gerente vincula depois)
- Botoes de compartilhar (link publico), copiar, editar, excluir

#### 3. Nova pagina publica: `src/pages/PublicMaintenance.tsx`
- Rota: `/manutencao/:recordId`
- Segue o mesmo padrao do `PublicStaff.tsx`
- Carrega o registro pelo ID sem autenticacao
- Exibe checkboxes para cada situacao de manutencao
- Campo de detalhe ao marcar um item (ex: "qual lampada?")
- Seletor de festa quando `event_id` for null
- Campo de observacoes gerais (textarea)
- Botao "Enviar"
- Tela de sucesso apos envio

#### 4. Sub-tabs na aba Checklist (`Formularios.tsx`)
- Transformar a aba Checklist em um container com sub-tabs: "Equipe" e "Manutencao"
- "Equipe" mostra o `EventStaffManager` (como esta hoje)
- "Manutencao" mostra o novo `MaintenanceManager`

#### 5. Rota no `App.tsx`
- Adicionar `<Route path="/manutencao/:recordId" element={<PublicMaintenance />} />`

### Arquivos afetados
- **Nova migration SQL** -- tabela `maintenance_entries` + RLS
- **`src/components/agenda/MaintenanceManager.tsx`** -- novo (componente admin)
- **`src/pages/PublicMaintenance.tsx`** -- novo (pagina publica)
- **`src/pages/Formularios.tsx`** -- sub-tabs na aba Checklist
- **`src/App.tsx`** -- nova rota publica
- **`src/integrations/supabase/types.ts`** -- atualizado automaticamente apos migration
