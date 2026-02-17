

## Correção do campo Data - mesma abordagem dos horários

### Diagnóstico
O campo "Data" usa `<input type="date">` nativo, que no iOS Safari renderiza com controles do sistema operacional com largura intrínseca fixa - exatamente o mesmo problema que os campos de horário tinham antes da correção.

### Solução proposta
Substituir o `<input type="date">` por **3 Selects lado a lado** (Dia / Mês / Ano), usando os mesmos componentes Select do Radix. Isso garante aparência idêntica aos campos de Horário, Status e Tipo de festa.

### Detalhes técnicos

**Arquivo**: `src/components/agenda/EventFormDialog.tsx`

1. **Criar constantes** para as opções:
   - Dias: 01 a 31
   - Meses: Janeiro a Dezembro (valor numérico 01-12, label em português)
   - Anos: 2024 a 2030

2. **Adicionar estado local** para dia, mês e ano separados, sincronizando com `form.event_date` (formato `YYYY-MM-DD`)

3. **Substituir o input nativo** por 3 Selects dentro de um container `flex gap-2`:
```text
<div class="space-y-2">
  <Label>Data *</Label>
  <div class="flex gap-2">
    <Select placeholder="Dia" />    (flex-1)
    <Select placeholder="Mês" />    (flex-[2] - um pouco maior para caber o nome)
    <Select placeholder="Ano" />    (flex-1)
  </div>
</div>
```

4. **Sincronizar valores**: quando os 3 campos estiverem preenchidos, montar a string `YYYY-MM-DD` e atualizar `form.event_date`. Na edição, fazer o parse inverso para popular os selects.

5. **Validação**: o formulário continua exigindo data preenchida (os 3 selects precisam ter valor).

### Resultado esperado
- Campo de data com aparência consistente com todos os outros selects do formulário
- Largura 100% garantida em iOS, Android e desktop
- Seleção intuitiva de dia, mês e ano
- Sem regressão nos demais campos

