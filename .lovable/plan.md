
## Tornar campo "Unidade" obrigatorio quando buffet tem multiplas unidades

### Problema
Eventos podem ser criados sem unidade atribuida quando o buffet tem mais de uma unidade, causando inconsistencia na contagem de festas ao usar o filtro "Todas as unidades" vs filtros individuais.

### Solucao

**Arquivo: `src/components/agenda/EventFormDialog.tsx`**

1. **Adicionar validacao no submit** (linha ~195): Quando `units.length > 1`, verificar se `form.unit` esta preenchido antes de permitir o submit. Se nao estiver, mostrar toast de erro.

2. **Marcar label como obrigatorio visualmente**: No campo "Unidade" (linha ~332), quando `units.length > 1`, adicionar asterisco `*` ao label (mesmo padrao do "Nome do cliente *").

3. **Adicionar `required` visual no Select**: Quando ha multiplas unidades, indicar que o campo e obrigatorio.

### Detalhes tecnicos

**Validacao no handleSubmit:**
```text
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!form.title || !form.event_date) return;
  if (units.length > 1 && !form.unit) {
    toast.error("Selecione uma unidade");
    return;
  }
  // ... resto igual
};
```

**Label condicional:**
```text
<Label>Unidade{units.length > 1 ? " *" : ""}</Label>
```

### Arquivos modificados
- `src/components/agenda/EventFormDialog.tsx` -- adicionar validacao e indicador visual de obrigatoriedade
