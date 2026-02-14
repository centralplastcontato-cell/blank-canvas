

## Renomear "alerta reminded 2h" para texto amigavel

### Problema

Na timeline, o texto "alerta reminded 2h" aparece cru porque nao tem um mapeamento amigavel na funcao `formatAction`. Os usuarios nao entendem o que significa.

### Solucao

Adicionar uma linha na funcao `formatAction` em `ResumoDiarioTab.tsx` para traduzir esse tipo de acao:

**Arquivo: `src/components/inteligencia/ResumoDiarioTab.tsx`**

Na funcao `formatAction`, adicionar antes do `if (action === "transfer")`:

```
if (action.includes("alerta") && action.includes("reminded")) return "sem resposta há mais de 2h — requer atenção";
```

Tambem adicionar icone dedicado na funcao `getActionIcon`:

```
if (action.includes("alerta")) return "🚨";
```

### Resultado

Em vez de "alerta reminded 2h", o usuario vera: **"sem resposta ha mais de 2h -- requer atencao"** com um icone de alerta.

