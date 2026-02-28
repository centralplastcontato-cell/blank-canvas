

## Melhorar Visual do Dialog "Nova Escala"

### Problema atual
O dialog esta com visual basico e generico, sem seguir o padrao premium do restante do sistema.

### Melhorias propostas

**Arquivo**: `src/components/freelancer/CreateScheduleDialog.tsx`

1. **Header com icone e descricao**: Adicionar icone CalendarPlus ao lado do titulo e uma descricao curta abaixo ("Defina o periodo e selecione as festas para a escala").

2. **Campos com labels melhorados**: Labels com icones pequenos (Type icon para titulo, CalendarDays para datas), tracking uppercase discreto no estilo do design system (`text-[11px] tracking-[0.18em]`).

3. **Inputs maiores**: Aumentar altura dos botoes de data para `h-12` para melhor toque mobile.

4. **Secao de festas com borda lateral**: Aplicar `border-l-4 border-l-primary/40` na secao de festas do periodo para destaque visual, seguindo o padrao do sistema.

5. **Cards de festa refinados**: Melhorar os cards de cada festa com hover mais suave, badge de tipo de evento, e layout mais espaçado.

6. **Botao "Criar Escala" maior e com destaque**: `h-12` com `shadow-md` e icone de check.

7. **Botao "Selecionar todos / Nenhum"**: Adicionar toggle rapido acima da lista de festas para facilitar selecao em massa.

### Detalhes tecnicos

- Imports adicionais: `CalendarPlus`, `Type`, `CheckCircle2`, `ToggleLeft` do lucide-react
- Adicionar `DialogDescription` ao header
- Manter toda logica funcional intacta (fetch de eventos, submit, auto-titulo)
- Aplicar classes do design system: `text-[11px] tracking-[0.18em]` para sub-labels, `rounded-xl` para cards de festa, `bg-primary/5` para secao destacada

