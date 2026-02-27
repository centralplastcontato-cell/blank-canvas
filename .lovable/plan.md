

## Adicionar log de redefinicoes de senha no Hub

### Resumo
Criar um sistema de auditoria que registra toda redefinicao de senha feita por administradores, mostrando quando e por quem foi feita, visivel no painel do Hub.

### Etapas

#### 1. Criar tabela `password_reset_logs`

Nova tabela no banco para registrar cada redefinicao:

```text
password_reset_logs
- id (uuid, PK)
- target_user_id (uuid, NOT NULL) -- usuario que teve a senha redefinida
- target_user_name (text) -- nome do usuario alvo
- target_user_email (text) -- email do usuario alvo
- reset_by_user_id (uuid, NOT NULL) -- admin que fez o reset
- reset_by_user_name (text) -- nome do admin
- company_id (uuid, nullable) -- empresa contexto
- created_at (timestamptz, default now())
```

Com RLS habilitado e politica permitindo leitura para admins/gestores.

#### 2. Atualizar edge function `manage-user`

No bloco `reset_password` (~linha 366-399), apos o reset bem-sucedido:
- Buscar o nome/email do usuario alvo (profiles)
- Buscar o nome do admin que executou (requester profile)
- Inserir registro na tabela `password_reset_logs`

#### 3. Exibir historico no Hub (pagina HubUsers)

Adicionar um botao/icone de "Historico de senhas" que abre um dialog/sheet listando os registros de `password_reset_logs`, mostrando:
- Nome do usuario que teve a senha redefinida
- Nome do admin que redefiniu
- Data/hora da redefinicao

Ordenado do mais recente para o mais antigo.

### Detalhes tecnicos

**Arquivos alterados:**
1. Nova migration SQL (criar tabela + RLS)
2. `supabase/functions/manage-user/index.ts` (inserir log apos reset)
3. `src/pages/HubUsers.tsx` (adicionar botao e dialog de historico)

**Nenhuma dependencia nova necessaria.**

