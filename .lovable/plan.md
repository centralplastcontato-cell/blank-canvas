

# Calendario Real no Chatbot da LP

## Problema Atual

Os dias do mes sao exibidos como uma grade sequencial simples (1, 2, 3, 4, 5, 6, 7...) sem respeitar em qual dia da semana cada numero cai. Isso nao parece um calendario real.

## Solucao

Transformar a grade de dias em um mini-calendario com:
- **Cabecalho** com os dias da semana: D | S | T | Q | Q | S | S
- **Celulas vazias** antes do dia 1, de acordo com o dia da semana em que o mes comeca
- **Dias posicionados** na coluna correta do dia da semana

### Exemplo visual (Fevereiro 2026)

Fevereiro 2026 comeca num domingo:

```text
 D   S   T   Q   Q   S   S
 1   2   3   4   5   6   7
 8   9  10  11  12  13  14
15  16  17  18  19  20  21
22  23  24  25  26  27  28
```

Se fosse Marco 2026 (comeca domingo):

```text
 D   S   T   Q   Q   S   S
 1   2   3   4   5   6   7
 8   9  10  ...
```

## Detalhes Tecnicos

### Arquivo alterado

**`src/components/landing/LeadChatbot.tsx`**

### Mudancas

1. **Funcao `getDaysInMonth`** - Atualizar para considerar ano bissexto (Fevereiro 2026 = 28 dias, mas 2028 = 29)

2. **Funcao `addDayOfMonthStep`** - Calcular o dia da semana do primeiro dia do mes selecionado usando `new Date(year, monthIndex, 1).getDay()`. Adicionar celulas vazias (`""`) no inicio do array de opcoes para alinhar o dia 1 na coluna correta.

3. **Renderizacao na grid** - Adicionar uma linha de cabecalho com "D S T Q Q S S" acima da grid de botoes. Celulas vazias serao renderizadas como `<div>` sem conteudo (espacadores invisiveis). Manter `grid grid-cols-7`.

4. **Logica de mes para indice** - Mapear nome do mes (ex: "Fevereiro") para indice JS (0-11) para calcular `new Date(2026, 1, 1).getDay()` = 0 (domingo).

### Comportamento

- O cabecalho "D S T Q Q S S" aparece acima dos botoes de dia
- Celulas vazias antes do dia 1 sao transparentes e nao clicaveis
- Os dias continuam clicaveis com o mesmo estilo atual
- Funciona para qualquer mes/ano automaticamente
- Nao afeta nenhum outro fluxo do chatbot

