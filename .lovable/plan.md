# Varredura concluída — 2 problemas distintos

## Diagnóstico

**Problema 1 — Ingrid (Mega Magic) perde acesso intermitente**
São duas race conditions:

- **Agenda flash de "módulo não habilitado":** `useCompanyModules` lê `currentCompany` sem expor `isLoading`, e o default é `agenda: false`. Quando o check de permissão termina antes do `CompanyContext`, a Agenda renderiza por 1 frame a tela de "Módulo não habilitado" e some.
- **Central de Atendimento (WhatsApp) em branco:** se `useUserRole` falhar nos 3 retries (ou se a Ingrid não tiver linha em `user_roles`), `WhatsApp.tsx` faz `return null` silenciosamente → tela branca sem erro. Além disso, `useUnitPermissions` é chamado **sem `companyId`**, então cai num UUID hardcoded e calcula `allowedUnits` errado nessa janela.

**Problema 2 — Lag ao avançar mês na Agenda (visível até para o Rodrigo admin)**
A cada troca de mês, o `fetchEvents` em `src/pages/Agenda.tsx` dispara **~8 queries em paralelo**, sendo que **três delas não têm filtro de data** e baixam o histórico inteiro da empresa:
- `event_checklist_items` (sem range)
- `event_payments` (sem range)
- `pre_reservations` "all" (sem range nem limite)

Pior ainda: depois da 1ª carga, **não há `loading = true`** nas trocas de mês → UI parece travada. E `allowedUnits` recria referência a cada render → invalida `useCallback` → dispara re-fetch extra.

---

## Plano de correção (passo a passo, conforme sua preferência)

Vou dividir em **3 etapas independentes**, com validação visual entre cada uma.

### Etapa 1 — Corrigir acesso da Ingrid (race conditions de permissão)
**Arquivos:** `src/pages/Agenda.tsx`, `src/pages/WhatsApp.tsx`, `src/hooks/useUnitPermissions.ts`

- Em `Agenda.tsx`: ler `isLoading` do `useCompany()` e incluir no gate (`if (permLoading || companyLoading) return <LoadingScreen />`). Elimina o flash "Módulo Agenda não habilitado".
- Em `WhatsApp.tsx`:
  - Substituir `return null` por `<LoadingScreen message="Verificando permissões..." />` (com fallback para mostrar erro se persistir).
  - Passar `currentCompany?.id` em `useUnitPermissions(user?.id, currentCompany?.id)` — hoje vai sem company.
- Em `useUnitPermissions.ts`: estabilizar referência de `allowedUnits` (só atualizar state quando o conteúdo realmente mudar) para parar de invalidar caches em telas que dependem dele.

**Resultado esperado:** Ingrid passa a abrir Agenda e Central de Atendimento de forma consistente, sem flash de "sem permissão" nem tela branca.

### Etapa 2 — Eliminar o lag ao trocar de mês na Agenda
**Arquivo:** `src/pages/Agenda.tsx` (apenas `fetchEvents` e o `useEffect` de re-fetch)

- Restringir `event_checklist_items` e `event_payments` aos IDs dos eventos do mês (`.in("event_id", ...)` após `eventsRes` resolver).
- Adicionar range de data em `pre_reservations` "all" (ou substituir pela versão já filtrada).
- Sempre ativar `setLoading(true)` na troca de mês (não só no primeiro load) → feedback visual imediato.
- Estabilizar `allowedUnits` no Agenda via `useMemo` para parar re-fetches desnecessários.
- Corrigir deps incompletas do `useEffect` que rebusca closed-in-period.

**Resultado esperado:** Trocar de mês fica responsivo, com loader visível e sem refetch global do histórico da empresa.

### Etapa 3 — Verificar dados da Ingrid em `user_roles`
- Rodar query de leitura no Supabase para confirmar que ela tem linha em `user_roles` (se não tiver, é a causa raiz da tela branca, e a correção da Etapa 1 só mostra mensagem de erro em vez de branco — precisaria criar a role).

---

## Fora de escopo
- Não vou tocar em lógica de WhatsApp/conexão/bot.
- Não vou alterar RLS nem schema do banco nesta passada (apenas leitura na Etapa 3).
- Não vou refatorar o `Agenda.tsx` inteiro (2.428 linhas) — apenas os pontos identificados.

## Validação
Depois de cada etapa, te entrego o resumo visual + funcional para você testar com a Ingrid (Etapa 1) e com o Rodrigo passando os meses (Etapa 2) antes de seguir.

Posso começar pela **Etapa 1** (acesso da Ingrid)?