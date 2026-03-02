
## Mostrar "Mes de interesse" sempre, independente de ser ex-cliente

### Problema
Atualmente, o campo "Mes de interesse" so aparece quando o lead **nao** foi cliente. Ex-clientes tambem precisam desse campo para que seja possivel filtra-los por mes ao criar campanhas. Sem isso, nao ha como segmentar ex-clientes por periodo de interesse.

### Solucao

**Arquivo: `src/components/campanhas/BaseLeadFormDialog.tsx`**

1. **Mover o Select de "Mes de interesse" para fora do condicional** -- ele aparecera sempre, tanto para ex-clientes quanto para novos leads
2. **Manter o campo "Quando foi a festa?"** visivel apenas para ex-clientes (como esta hoje)
3. **Ajustar o `handleSave`** para sempre enviar `month_interest`, removendo a condicao `isFormerClient === "no"`

Layout atualizado:

```text
Ja foi cliente?  (Sim) (Nao)

[Se Sim] Quando foi a festa?  ________

Mes de interesse  [Select v]    <-- aparece SEMPRE
```

### Detalhes tecnicos

- Remover o `else` que condiciona o Select de mes ao estado `isFormerClient === "no"` (linhas ~190-204)
- Colocar o Select de mes **depois** do bloco condicional, fora do ternario
- No payload do `handleSave` (linha ~88), mudar `month_interest` de `isFormerClient === "no" ? monthInterest || null : null` para simplesmente `monthInterest || null`
