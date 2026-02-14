

## Corrigir Lógica da Aba "Atender Agora"

### Problema
A aba "Atender Agora" exige que o lead tenha `priority_flag = true`, o que só acontece em 3 cenários específicos (score > 60, agendou visita, ou orçamento enviado). Leads novos em atendimento ativo, como a Janaína (score 45, temperatura quente), ficam invisíveis.

### Solução
Mudar a lógica do frontend para que "Atender Agora" mostre **todos os leads ativos com temperatura acima de "frio"**, independente do `priority_flag`. O `priority_flag` passa a ser um indicador visual extra (ex: destaque no card), mas não mais um filtro eliminatório.

### Mudanças

**Arquivo: `src/components/inteligencia/PrioridadesTab.tsx`**

Alterar o filtro de "Atender Agora" de:
```typescript
const atenderAgora = activeLeads.filter(
  d => d.priority_flag && d.temperature !== 'frio'
);
```

Para:
```typescript
const atenderAgora = activeLeads.filter(
  d => d.temperature !== 'frio' && !d.abandonment_type
);
```

Isso inclui todos os leads ativos com temperatura **morno**, **quente** ou **pronto** que não estejam em abandono (os de abandono ficam na coluna "Em Risco").

### Resultado esperado
- Leads novos em atendimento ativo (como Janaína) aparecem em "Atender Agora"
- Leads em risco de abandono continuam em "Em Risco"
- Leads frios (score < 20) continuam em "Frios"
- Leads fechados/perdidos continuam excluídos das prioridades

### Detalhes Técnicos
- Apenas 1 linha de código muda no frontend
- Não requer alteração no banco de dados
- O `priority_flag` no banco continua sendo calculado normalmente (pode ser usado no futuro para badges ou ordenação)

