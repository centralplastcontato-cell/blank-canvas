

# Reabrir Lista Finalizada + Estatisticas por Faixa Etaria

## O que sera feito

Duas mudancas no arquivo `src/pages/PublicAttendance.tsx`:

### 1. Botao "Reabrir Lista"

Quando a lista estiver finalizada, adicionar um botao "Reabrir Lista" abaixo do banner verde. Ao clicar:
- Limpa o campo `finalized_at` no banco (seta para `null`)
- A lista volta ao modo de edicao normal (adicionar/editar/remover convidados)
- Toast de confirmacao: "Lista reaberta!"

### 2. Estatisticas por Faixa Etaria

Adicionar um card de resumo acima da lista de convidados (visivel sempre que houver convidados) com as seguintes informacoes calculadas a partir do campo `age` de cada convidado:

- **Total de presentes**: numero total de convidados
- **0 a 4 anos**: bebes/criancas pequenas
- **5 a 10 anos**: criancas
- **12 a 16 anos**: pre-adolescentes
- **16 a 18 anos**: adolescentes
- **18+ anos**: adultos
- **Sem idade informada**: convidados sem o campo age preenchido

O calculo sera feito em tempo real no frontend, parseando o campo `age` (string) de cada guest para numero e classificando nas faixas.

## Detalhes tecnicos

### Arquivo: `src/pages/PublicAttendance.tsx`

**Botao Reabrir:**
- Adicionar funcao `handleReopen()` que faz `UPDATE attendance_entries SET finalized_at = null WHERE id = entry.id`
- Botao com icone de refresh, estilo outline, posicionado abaixo do banner de finalizado
- Texto: "Reabrir Lista"

**Estatisticas:**
- Funcao `useMemo` que percorre `entry.guests`, parseia `guest.age` para numero inteiro e conta por faixa
- Exibido como um grid de cards pequenos (3 colunas em mobile) com o numero grande e o label da faixa abaixo
- Posicionado entre o banner/receptionist e a lista de convidados

**Faixas etarias consideradas:**
```text
0-4   -> parseInt(age) >= 0 && parseInt(age) <= 4
5-10  -> parseInt(age) >= 5 && parseInt(age) <= 10
11-16 -> parseInt(age) >= 11 && parseInt(age) <= 16
16-18 -> parseInt(age) > 16 && parseInt(age) <= 18
18+   -> parseInt(age) > 18
N/A   -> age vazio ou nao numerico
```

Nota: A faixa "12 a 16" mencionada sera ajustada para "11 a 16" para nao haver gap entre 10 e 12.

