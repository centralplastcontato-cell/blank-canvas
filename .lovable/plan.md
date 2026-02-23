
# Corrigir isolamento de notificacoes entre empresas

## Problema

Os 4 banners de alerta (ClientAlertBanner, VisitAlertBanner, QuestionsAlertBanner, TransferAlertBanner) filtram por `company_id` na busca inicial, mas os handlers de **INSERT realtime** nao verificam o `company_id`. Quando um usuario pertence a mais de uma empresa, notificacoes de outra empresa aparecem no painel da empresa ativa.

O hook `useAppNotifications` ja implementa essa verificacao corretamente (linhas 130-136), mas os banners individuais nao replicam esse padrao.

## Solucao

Adicionar verificacao de `company_id` no handler de INSERT realtime de cada banner, usando `getCurrentCompanyId()` (que ja esta importado em todos os arquivos).

## Arquivos a editar

### 1. `src/components/admin/ClientAlertBanner.tsx` (linhas 89-97)

No handler de INSERT, antes de verificar o tipo, adicionar:

```typescript
const notification = payload.new as ClientNotification & { company_id?: string };
const currentCompanyId = getCurrentCompanyId();
if (notification.company_id && currentCompanyId && notification.company_id !== currentCompanyId) {
  return;
}
```

### 2. `src/components/admin/VisitAlertBanner.tsx` (linhas 90-98)

Mesma logica no handler de INSERT.

### 3. `src/components/admin/QuestionsAlertBanner.tsx` (linhas 84-91)

Mesma logica no handler de INSERT.

### 4. `src/components/admin/TransferAlertBanner.tsx` (linhas 74-78)

Mesma logica no handler de INSERT.

## Detalhes tecnicos

- `getCurrentCompanyId()` ja esta importado nos 4 arquivos
- O padrao e identico ao usado em `useAppNotifications` (linhas 130-136)
- Nenhuma mudanca de banco de dados necessaria
- A filtragem inicial (fetch) ja funciona corretamente, apenas o realtime precisa do filtro
