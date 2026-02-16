

# Controle de Acesso Granular para Dados Sensíveis de Leads

## Objetivo
Implementar mascaramento de dados sensíveis (telefone/WhatsApp) baseado em permissões granulares. Usuários sem a permissão adequada verrao numeros parcialmente ocultos (ex: `55119****9999`) e nao poderao copiar ou clicar para abrir o WhatsApp.

## Abordagem

O controle sera **apenas no frontend** (visual), pois o backend ja retorna os dados completos para todos os membros da empresa via RLS -- o que e necessario para o funcionamento do bot, automacoes e busca por telefone. A protecao granular e contra exposicao visual casual para cargos operacionais.

---

## Etapas

### 1. Criar nova permissao `leads.contact.view` no banco

Inserir na tabela `permission_definitions`:
- **code**: `leads.contact.view`
- **name**: `Ver Contato Completo`
- **description**: `Permite visualizar telefone/WhatsApp completo dos leads`
- **category**: `Leads`

### 2. Criar utilitario de mascaramento

Novo arquivo `src/lib/mask-utils.ts` com funcao:
- `maskPhone(phone: string): string` -- retorna algo como `5511****9999` (mostra primeiros 4 e ultimos 4 digitos)
- `canViewContact(isAdmin: boolean, hasPermission: (code: string) => boolean): boolean`

### 3. Atualizar componentes que exibem telefone

Os seguintes componentes precisam ser atualizados para receber a prop `canViewContact` e usar o mascaramento:

| Componente | O que mudar |
|---|---|
| `LeadsTable.tsx` | Coluna WhatsApp na tabela desktop; link externo |
| `LeadCard.tsx` | Exibicao do telefone e botao WhatsApp |
| `KanbanCard.tsx` | Menu "Copiar telefone" e "Abrir WhatsApp" |
| `LeadDetailSheet.tsx` | Botao "Abrir WhatsApp" e exibicao do numero |
| `exportLeads.ts` | Mascarar coluna WhatsApp no CSV exportado |

Em cada componente:
- Se `canViewContact = false`: exibir numero mascarado, desabilitar botoes de copiar/abrir WhatsApp
- Se `canViewContact = true`: comportamento atual (numero completo)

### 4. Passar permissao dos pages para os componentes

Nos arquivos `Admin.tsx` e `CentralAtendimento.tsx`, adicionar:
```typescript
const canViewContact = isAdmin || hasPermission('leads.contact.view');
```
E passar como prop para `LeadsTable`, `LeadCard`, `KanbanCard`, `LeadDetailSheet`.

---

## Secao Tecnica

### SQL (migracao)
```sql
INSERT INTO permission_definitions (code, name, description, category, sort_order)
VALUES ('leads.contact.view', 'Ver Contato Completo', 'Permite visualizar telefone/WhatsApp completo dos leads', 'Leads', 15);
```

### Funcao de mascaramento
```typescript
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 8) return '****' + digits.slice(-4);
  return digits.slice(0, 4) + '****' + digits.slice(-4);
}
```

### Componentes afetados (resumo de mudancas)

**LeadCard / KanbanCard / LeadDetailSheet**: 
- Nova prop `canViewContact: boolean`
- Exibir `maskPhone(lead.whatsapp)` quando `!canViewContact`
- Desabilitar/ocultar botoes de "Copiar telefone" e "Abrir WhatsApp"

**exportLeads.ts**:
- Nova prop `canViewContact` no objeto de parametros
- Mascarar coluna WhatsApp quando `!canViewContact`

**Admin.tsx / CentralAtendimento.tsx**:
- Calcular `canViewContact` e propagar como prop

### Impacto
- Admins e gestores com a permissao verao tudo normalmente
- Comerciais sem a permissao verao numeros mascarados
- Nenhuma mudanca no backend/RLS (dados continuam acessiveis para automacoes)
- A permissao pode ser concedida individualmente via painel de permissoes existente

