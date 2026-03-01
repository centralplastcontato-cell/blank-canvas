
# Restringir UPDATE Anonimo por UUID Especifico

## O Problema

As 3 tabelas abaixo tem politicas de UPDATE anonimo com `USING(true)`, permitindo que qualquer pessoa modifique qualquer registro sem autenticacao:

| Tabela | Politica Atual | Risco |
|--------|---------------|-------|
| `attendance_entries` | `USING(true)` | Alguem pode alterar listas de presenca de qualquer festa |
| `event_info_entries` | `USING(true)` | Alguem pode alterar informativos de qualquer evento |
| `event_staff_entries` | `USING(true)` | Alguem pode alterar dados de equipe/financeiro de qualquer festa |

## A Solucao

Nao precisamos remover o acesso anonimo (os formularios publicos dependem dele), mas podemos **restringir quais colunas podem ser atualizadas** e garantir que a politica esteja correta.

Como o Postgres RLS nao consegue "saber" qual UUID o usuario esta tentando atualizar diretamente via politica (o `USING(true)` ja filtra pelo `WHERE id = X` do query), a abordagem mais segura e:

1. **Substituir UPDATE anonimo direto por RPCs `SECURITY DEFINER`** que aceitam o UUID e atualizam apenas os campos permitidos
2. **Remover as politicas de UPDATE anonimo** das 3 tabelas

Isso garante que usuarios anonimos so possam atualizar campos especificos (ex: guests, items) e nao campos sensiveis (ex: company_id, event_id).

## Detalhes Tecnicos

### Migration SQL (1 arquivo)

**DROP das 3 politicas de UPDATE anonimo:**
- `DROP POLICY "Anon can update attendance entry" ON attendance_entries`
- `DROP POLICY "Anon can update event info entry" ON event_info_entries`
- `DROP POLICY "Anon can update staff entry" ON event_staff_entries`

**3 RPCs novos (SECURITY DEFINER):**

1. `update_attendance_entry_public(_entry_id uuid, _guests jsonb, _notes text, _receptionist_name text, _event_id uuid, _finalized_at timestamptz)`
   - Atualiza apenas: guests, notes, receptionist_name, event_id, finalized_at
   - NAO permite alterar: company_id, filled_by

2. `update_event_info_entry_public(_entry_id uuid, _items jsonb, _notes text, _event_id uuid)`
   - Atualiza apenas: items, notes, event_id
   - NAO permite alterar: company_id, filled_by

3. `update_staff_entry_public(_entry_id uuid, _staff_data jsonb, _notes text, _event_id uuid)`
   - Atualiza apenas: staff_data, notes, event_id
   - NAO permite alterar: company_id, filled_by

### Codigo Frontend (3 arquivos)

1. **`src/pages/PublicAttendance.tsx`** -- substituir `supabase.from("attendance_entries").update(...)` por `supabase.rpc("update_attendance_entry_public", {...})`

2. **`src/pages/PublicEventInfo.tsx`** -- se houver update, substituir por RPC (verificar se essa pagina faz updates)

3. **`src/pages/PublicStaff.tsx`** -- substituir update direto por `supabase.rpc("update_staff_entry_public", {...})`

Paginas publicas que tambem fazem updates e precisam ser verificadas:
- `PublicMaintenance.tsx` (maintenance_entries)
- `PublicPartyMonitoring.tsx` (party_monitoring_entries)
- `PublicPartyControl.tsx`

### O que NAO muda
- Usuarios autenticados (admin/gestor) continuam com UPDATE normal via politica de empresa
- Formularios publicos continuam funcionando, so que agora via RPC seguro
- Nenhum dado e perdido
