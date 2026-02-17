

## Permitir criacao de equipe sem festa -- gerente anexa a festa

### Problema atual
O admin precisa selecionar uma festa (evento) ao criar o registro de equipe, mas muitas vezes nao ha festas cadastradas ainda, ou quem sabe qual festa e o gerente. O fluxo correto e: admin cria a equipe vazia, compartilha o link, e o **gerente** escolhe a festa ao preencher.

### Mudancas

#### 1. Migration SQL
- Tornar `event_id` nullable na tabela `event_staff_entries` (`ALTER COLUMN event_id DROP NOT NULL`)
- Adicionar policy RLS anonima de SELECT na tabela `company_events` filtrada pelo `company_id` do registro de staff (para que o gerente consiga ver a lista de festas no formulario publico)

#### 2. EventStaffManager.tsx (dialog do admin)
- Tornar a selecao de festa **opcional** (remover a validacao que exige `selectedEventId`)
- Manter o seletor de festa no dialog, mas sem obrigatoriedade
- Permitir salvar com `event_id: null`
- No card da listagem, mostrar "Sem festa vinculada" quando `event_id` for null

#### 3. PublicStaff.tsx (formulario do gerente)
- Quando o registro nao tiver `event_id`, exibir um seletor de festas da empresa no topo do formulario
- Buscar as festas via `company_events` usando o `company_id` do registro de staff
- Ao enviar, salvar tambem o `event_id` escolhido pelo gerente junto com os dados de staff
- Se o registro ja tiver um `event_id`, exibir apenas o nome da festa (comportamento atual)

### Fluxo final
1. Admin clica "Nova Equipe" -- salva sem festa (rapido)
2. Admin copia link e envia ao gerente via WhatsApp
3. Gerente abre o link, escolhe a festa, preenche nomes/PIX/valores, envia

