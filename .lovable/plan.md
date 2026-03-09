

## Plano: Corrigir inputs do intervalo de segurança

### Problemas identificados

1. **Não permite apagar o campo**: O `value` sempre mostra o número do state (`botSettings?.follow_up_send_min_delay ?? 8`), e o `onChange` ignora valores vazios (`if (!isNaN(v))`). Isso impede o usuário de limpar o campo para digitar um novo valor.

2. **Máximo travado em 30**: O `max={30}` no HTML e `Math.min(30, ...)` no `onBlur` forçam o valor de volta para 30 quando o usuário digita 60.

### Solução

Usar state intermediário de string para os dois campos, permitindo que fiquem vazios durante a edição. Aplicar clamp e salvar apenas no `onBlur`. Aumentar o limite máximo para 120 segundos.

### Alteração em `AutomationsSection.tsx`

- Adicionar dois estados locais de string: `minDelayInput` e `maxDelayInput`, sincronizados com `botSettings` via `useEffect`.
- No `onChange`: atualizar apenas o state de string (permite vazio).
- No `onBlur`: fazer o clamp (mín 5, máx 120), atualizar `botSettings` e salvar.
- Mudar `max={30}` para `max={120}` e ajustar a mensagem de recomendação.

### Arquivo alterado
| Arquivo | Mudança |
|---|---|
| `src/components/whatsapp/settings/AutomationsSection.tsx` | Inputs com state de string + limite máx 120s |

