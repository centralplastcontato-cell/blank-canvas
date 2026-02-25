

## Corrigir Calendario do Chatbot para Meses com Ano (ex: "Marco/27")

### Problema
Quando o usuario seleciona um mes com ano (como "Marco/27"), o sistema nao reconhece o nome no `monthNameToIndex` porque ele procura por "Marco/27" em vez de "Marco". Resultado:
- `getDaysInMonth` retorna 31 (fallback generico) -- pode estar errado em meses como Fevereiro
- `firstDayOfWeek` retorna 0 (Domingo) -- ignora o ano real, gerando o calendario com os dias nas colunas erradas

### Solucao
Criar uma funcao auxiliar que extrai o nome do mes e o ano de strings como "Marco/27", "Janeiro/2027", ou simplesmente "Marco":

```text
"Marco/27"   -> { monthName: "Marco", year: 2027 }
"Janeiro/2027" -> { monthName: "Janeiro", year: 2027 }
"Abril"      -> { monthName: "Abril", year: 2026 }
```

### Alteracoes

**Arquivo: `src/components/landing/LeadChatbot.tsx`**

1. **Nova funcao `parseMonthOption`** (antes de `getDaysInMonth`):
   - Recebe a string do mes selecionado
   - Usa regex para separar nome e ano (ex: `/27` ou `/2027`)
   - Anos de 2 digitos sao convertidos para 4 digitos (27 -> 2027)
   - Retorna `{ monthName, year }`

2. **Atualizar `getDaysInMonth`**:
   - Receber a string original (ex: "Marco/27")
   - Usar `parseMonthOption` para extrair mes e ano
   - Calcular dias com o ano correto em vez de `new Date().getFullYear()`

3. **Atualizar `addDayOfMonthStep`**:
   - Usar `parseMonthOption` para extrair mes e ano
   - Usar o ano extraido para calcular `firstDayOfWeek` corretamente
   - O label da mensagem continua usando a string original do usuario

### Resultado
- Marco/27: dia 1 cai na Segunda (coluna S) -- correto
- Fevereiro/28: mostra 28 dias (2028 nao e bissexto)
- Meses sem ano (ex: "Abril") continuam funcionando com o ano atual

