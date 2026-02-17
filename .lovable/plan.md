
## Correção definitiva dos campos de Horário

### Diagnóstico
O problema persiste porque inputs nativos `type="time"` e `type="date"` no iOS Safari renderizam com controles nativos do sistema operacional que possuem largura intrínseca fixa. CSS como `w-full`, `min-w-0`, `box-border` ajudam em desktop mas **não resolvem no iOS** porque o WebKit aplica dimensionamento interno nos controles nativos.

### Solução proposta
Substituir os inputs nativos de `type="time"` por **Selects customizados** (usando o componente Select do Radix que já está no projeto). Isso garante aparência consistente com os demais campos (Status, Tipo de festa, Pacote) e largura 100% em qualquer dispositivo.

### Detalhes técnicos

**Arquivo**: `src/components/agenda/EventFormDialog.tsx`

1. **Criar array de horários** (de 00:00 a 23:30 em intervalos de 30 minutos) para popular os Selects
2. **Substituir os dois inputs `type="time"`** por componentes `Select` com as opções de horário
3. **Empilhar os campos verticalmente** (um embaixo do outro, como os demais) para ocupar 100% da largura
4. Manter a lógica de estado (`start_time`, `end_time`) inalterada

**Estrutura resultante:**
```
<div class="space-y-2">
  <Label>Horario inicio</Label>
  <Select> ... opcoes de horario ... </Select>
</div>
<div class="space-y-2">
  <Label>Horario fim</Label>
  <Select> ... opcoes de horario ... </Select>
</div>
```

### Resultado esperado
- Campos de horario com aparencia identica aos campos Status, Tipo de festa e Pacote
- Largura 100% consistente em iOS, Android e desktop
- Intervalos de 30 minutos para facilitar a selecao
- Sem regressao nos demais campos
