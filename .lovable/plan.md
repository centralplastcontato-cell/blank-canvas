

## Corrigir indicador "Atualizando..." travado no PullToRefresh

### Problema
O indicador "Atualizando..." (componente PullToRefresh) fica travado na tela, especialmente no iOS/Safari mobile. Isso acontece porque o evento `touchend` pode nao disparar corretamente em certas condicoes de scroll no iOS, deixando o estado `isRefreshing = true` indefinidamente.

### Causa raiz
No `src/components/ui/pull-to-refresh.tsx`, o fluxo depende de:
1. `handleTouchStart` -> seta `isPulling = true`
2. `handleTouchMove` -> atualiza `pullDistance`
3. `handleTouchEnd` -> seta `isRefreshing = true`, chama `onRefresh()`, e no `finally` seta `isRefreshing = false`

Se o `touchend` nao disparar (comportamento documentado do iOS Safari com rubber-banding), `isRefreshing` fica `true` para sempre.

Alem disso, se `handleTouchMove` detectar `container.scrollTop > 0`, ele reseta `isPulling = false`. Quando `handleTouchEnd` finalmente dispara, ele ve `!isPulling` e retorna sem limpar o estado, mas `pullDistance` pode ainda estar > 10, mantendo o indicador visivel.

### Solucao
Aplicar 3 protecoes no componente `PullToRefresh`:

1. **Timeout de seguranca**: Se `isRefreshing` ficar `true` por mais de 10 segundos, resetar automaticamente para `false` e zerar `pullDistance`.

2. **Cleanup no touchMove**: Quando `isPulling` for resetado no `handleTouchMove`, tambem zerar `pullDistance` para que o indicador desapareca.

3. **Listener global de touchend**: Adicionar um listener no `document` para capturar `touchend` mesmo que o toque saia do container, garantindo que o estado sempre seja limpo.

### Arquivo modificado
**`src/components/ui/pull-to-refresh.tsx`**:
- Adicionar `useEffect` com timeout de 10s que reseta `isRefreshing` automaticamente
- Adicionar listener global de `touchend` no document quando `isPulling` estiver ativo
- Garantir que `pullDistance` seja zerado quando `isPulling` for resetado no move handler

### Detalhes tecnicos

```text
Estado atual (bugado):
  touchstart -> isPulling=true
  touchmove  -> pullDistance aumenta
  [iOS perde touchend]
  -> isRefreshing fica true OU pullDistance fica > 0
  -> indicador "Atualizando..." travado

Apos fix:
  touchstart -> isPulling=true + listener global touchend
  touchmove  -> pullDistance aumenta  
  [iOS perde touchend no container]
  -> listener global captura touchend -> cleanup
  -> OU timeout de 10s reseta automaticamente
  -> indicador desaparece
```

