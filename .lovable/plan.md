

## Corrigir badge duplicado "Lembrete enviado" na lista de leads incompletos

### Problema
Na aba "Nao Completaram", cada lead mostra dois badges identicos "Lembrete enviado":
1. O campo `botStep` exibe "Lembrete enviado" (traduzido de `proximo_passo_reminded`)
2. O campo `isReminded` (que detecta "reminded" no nome do step) tambem exibe um badge "Lembrete enviado"

Ambos mostram a mesma informacao, causando duplicacao visual.

### O que significa "Lembrete enviado"
Quando o lead nao responde a pergunta do bot sobre o proximo passo (agendar visita, tirar duvidas, etc.) dentro do tempo configurado, o sistema envia automaticamente um lembrete. "Lembrete enviado" indica que esse lembrete ja foi disparado e o lead ainda nao respondeu.

### Solucao
Ajustar a logica na edge function `daily-summary` para que, quando o step ja for `proximo_passo_reminded`, o label exibido seja mais descritivo (ex: "Aguardando resposta ao lembrete") e o `isReminded` seja usado apenas como informacao complementar que nao gera badge separado.

Alternativamente (mais simples): no componente `IncompleteLeadsSection`, nao mostrar o badge "Lembrete enviado" do `isReminded` quando o `botStep` ja contem essa informacao.

### Detalhes tecnicos

**Arquivo: `supabase/functions/daily-summary/index.ts`**
- Linha 306-310: Mudar o label de `proximo_passo_reminded` para "Aguardando resposta" (mais claro para o usuario)
- Mudar `proximo_passo` para "Escolhendo proximo passo"
- Manter `isReminded` como flag interna, mas o badge no front so aparece se `botStep` nao ja indicar lembrete

**Arquivo: `src/components/inteligencia/ResumoDiarioTab.tsx`**
- Na `IncompleteLeadsSection`, esconder o badge de `isReminded` quando `botStep` ja contiver a palavra "lembrete" ou "reminded", evitando duplicacao
- Trocar labels tecnicos restantes (ex: `nome`, `tipo`, `convidados`) para versoes amigaveis como "Informando nome", "Tipo de evento", "Numero de convidados"

### Resultado
Cada lead mostra apenas um badge claro e descritivo, sem repeticao.

