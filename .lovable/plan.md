
## Problema

O campo de horas do **2o Follow-up** tem um limite maximo de **96 horas** definido no codigo (`max={96}`). Por isso, ao tentar digitar 144h, o valor e cortado para 96 no `onBlur`.

## Solucao

Aumentar os limites maximos de todos os follow-ups para permitir intervalos maiores, ja que buffets com ciclos de venda longos precisam de mais flexibilidade:

| Follow-up | Limite atual | Novo limite |
|-----------|-------------|-------------|
| 1o        | 72h         | 168h (7 dias) |
| 2o        | 96h         | 336h (14 dias) |
| 3o        | 168h        | 504h (21 dias) |
| 4o        | 240h        | 720h (30 dias) |

## Detalhes tecnicos

Arquivo: `src/components/whatsapp/settings/AutomationsSection.tsx`

Alterar os atributos `max` dos 4 inputs de delay e os respectivos `Math.min()` no `onBlur`:

1. **1o Follow-up** (linha ~1440): `max={72}` para `max={168}`, clamp para `168`
2. **2o Follow-up** (linha ~1518): `max={96}` para `max={336}`, clamp para `336`
3. **3o Follow-up** (linha ~1594): `max={168}` para `max={504}`, clamp para `504`
4. **4o Follow-up** (linha ~1670): `max={240}` para `max={720}`, clamp para `720`
