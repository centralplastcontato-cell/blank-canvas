

## Correção: Filtros lado a lado no mobile (Visitas)

### Problema
Os 3 selects de filtro (Status, Unidade, Responsável) estão empilhando no mobile porque usam `w-[140px]` fixo e `flex-wrap`, ocupando muito espaço horizontal e quebrando linha.

### Solução
Mudar os 3 selects para usarem `flex-1 min-w-0` em vez de `w-[140px]`, e garantir que o container pai use `flex-row` sem wrap, para que fiquem sempre lado a lado dividindo o espaço igualmente.

### Arquivo: `src/pages/Visitas.tsx` (~linhas 493-533)

- Alterar o container dos filtros de `flex items-center gap-2 flex-wrap` para `flex items-center gap-2 w-full`
- Trocar `w-[140px]` por `flex-1 min-w-0` nos 3 `SelectTrigger`s para que dividam o espaço proporcionalmente
- Manter o restante (cores, alturas, bordas) inalterado

### Resultado
Os 3 filtros ficarão alinhados lado a lado, dividindo o espaço da tela igualmente, tanto no mobile quanto no desktop.

