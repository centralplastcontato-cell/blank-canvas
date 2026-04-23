

## Mover "Resumo da Festa" para dentro do card do Checklist

### O que será feito

O painel "Resumo da Festa" será removido como card separado e inserido **dentro** do card do Checklist, aparecendo acima dos itens do checklist. Isso unifica visualmente as informações da festa com as tarefas operacionais, ideal para uso no Controle da Festa.

### Estrutura visual resultante

```text
┌─────────────────────────────────┐
│  📋 RESUMO DA FESTA             │
│  Aniversariante: MANUELLA — 1   │
│  Pais: Beatriz                  │
│  Pacote: CASTELO                │
│  Convidados: 50 pessoas         │
│  Horário: 19:00 até 23:00       │
│  Unidade: Castelo da Diversão   │
│  Opcionais / Observações        │
│  [Anotações internas textarea]  │
│─────────────────────────────────│
│  CHECKLIST (3/5) — 60%          │
│  ☑ Tarefa 1                     │
│  ☐ Tarefa 2                     │
│  [Nova tarefa...]          [+]  │
└─────────────────────────────────┘
```

### Etapas técnicas

#### 1. Modificar `EventDetailSheet.tsx`
- Remover o bloco standalone do `<EventSummaryPanel />` (linhas 580-587).
- Dentro do card do Checklist (linhas 589-596), adicionar o `<EventSummaryPanel />` antes do `<EventChecklist />`, com um separador visual (`border-b`) entre eles.

#### 2. Ajustar `EventSummaryPanel.tsx`
- Remover o wrapper externo (`rounded-xl border bg-card shadow-sm`) e o header com fundo — o componente agora vive dentro do card do Checklist.
- Manter apenas o conteúdo interno (linhas de info + textarea).
- O header "Resumo da Festa" passa a ser um label simples (`text-xs uppercase`) consistente com o label "Checklist".

### Arquivos alterados
- `src/components/agenda/EventDetailSheet.tsx` — mover o panel para dentro do card do Checklist
- `src/components/agenda/EventSummaryPanel.tsx` — remover wrapper externo, simplificar para conteúdo inline

### Resultado esperado
Ao abrir o painel lateral de uma festa, o card único mostrará primeiro o resumo completo da festa e logo abaixo o checklist operacional — tudo integrado no mesmo bloco visual, pronto para uso no Controle da Festa.

