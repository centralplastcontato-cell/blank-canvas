

# Plano: Log de Auditoria para Dados do Contratante

## Resumo
Registrar na tabela `activity_logs` quem preencheu/atualizou os dados do contratante de cada festa, diferenciando entre preenchimento manual (pelo usuário do buffet) e preenchimento público (pelo próprio cliente via link).

## Alterações

### 1. Adicionar log no formulário manual (`ManualClientDataForm.tsx`)
Após salvar com sucesso os dados do contratante (tanto insert quanto update), chamar `logActivity` com:
- **action**: `create` (novo) ou `update` (existente)
- **module**: `contracts`
- **entityType**: `client_data`
- **entityId**: o ID do `client_data_requests`
- **entityName**: nome do contratante preenchido
- **details**: `{ source: "manual", event_id }`

### 2. Adicionar log no formulário público (`submit_client_data_public` RPC)
Adicionar um INSERT na tabela `activity_logs` dentro da própria função SQL, registrando:
- **user_name**: `"Cliente (público)"`
- **action**: `create`
- **module**: `contracts`
- **entity_type**: `client_data`
- **entity_id**: o ID do request
- **entity_name**: nome extraído do `_client_data->>'nome'`
- **details**: `{ source: "public_form", event_id }`

Isso requer uma **migração** para atualizar a função RPC `submit_client_data_public`.

### 3. Arquivos modificados
- `src/components/agenda/ManualClientDataForm.tsx` — importar `logActivity` e chamá-lo após save
- Migração SQL — atualizar `submit_client_data_public` para inserir em `activity_logs`

### Detalhes técnicos
- A tabela `activity_logs` já existe e é usada pelo `ActivityLogPanel`
- O `logActivity` standalone (`src/lib/activityLog.ts`) será usado no formulário manual, pois o componente não precisa de hook
- No RPC público, o insert será direto pois não há usuário autenticado

