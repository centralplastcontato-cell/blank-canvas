
## Nova Lista de Presenca

Criar um modulo de "Lista de Presenca" digital seguindo o mesmo padrao dos checklists existentes (Manutencao, Acompanhamento de Festa). A recepcionista registra os convidados que chegam na festa via link publico compartilhado.

### Estrutura de dados

Cada registro armazena uma lista de convidados (guests) como JSONB, com os seguintes campos por convidado:

```text
Guest {
  name: string           -- Nome do convidado (crianca ou adulto)
  age: string            -- Idade (opcional)
  phone: string          -- Telefone
  is_child_only: boolean -- Se os pais deixaram a crianca (sem acompanhante)
  guardian_name: string   -- Nome do responsavel (quando is_child_only = true)
  guardian_phone: string  -- Telefone do responsavel (quando is_child_only = true)
  wants_info: boolean    -- Deseja receber informacoes do buffet
}
```

### Mudancas tecnicas

1. **Nova tabela `attendance_entries`**
   - id (uuid PK)
   - company_id (uuid FK companies)
   - event_id (uuid FK company_events, nullable)
   - guests (jsonb, default '[]')
   - receptionist_name (text, nullable) -- nome da recepcionista
   - notes (text, nullable)
   - filled_by (uuid, nullable)
   - created_at, updated_at (timestamps)
   - RLS identico ao `maintenance_entries` (anon select/update, company insert/delete)

2. **Novo componente `src/components/agenda/AttendanceManager.tsx`**
   - Componente admin para criar/editar/excluir registros
   - Ao criar, o admin vincula (opcionalmente) a festa
   - Cards colapsaveis mostrando contagem de convidados
   - Botoes de compartilhar link, copiar resumo, editar, excluir
   - Link publico: `/lista-presenca/:recordId`

3. **Nova pagina publica `src/pages/PublicAttendance.tsx`**
   - Formulario para a recepcionista preencher no celular
   - Campo "Nome da recepcionista" no topo
   - Seletor de festa (quando nao pre-vinculada)
   - Lista de convidados ja adicionados com numeracao (#1, #2...)
   - Formulario para adicionar convidado: nome, idade, telefone
   - Toggle "Crianca desacompanhada" que exibe campos de responsavel
   - Toggle "Deseja receber informacoes do buffet"
   - Botao "Adicionar" que salva automaticamente no banco
   - Contagem total no rodape

4. **Nova rota em `src/App.tsx`**
   - `/lista-presenca/:recordId` apontando para PublicAttendance

5. **Nova aba em `src/pages/Formularios.tsx`**
   - Adicionar aba "Presenca" com icone Users dentro da secao Checklist, ao lado de Equipe, Manutencao e Acompanhamento
