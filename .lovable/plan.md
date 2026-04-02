

## Opcionais da Festa com Impacto no Valor Total

### Problema
Não existe um campo para adicionar itens opcionais (ex: mesa de doces, DJ, decoração extra) com nome e valor, que reflitam automaticamente no valor total da festa.

### Solução
Adicionar uma seção "Opcionais" no formulário de criação/edição de festa, com lista dinâmica de itens (nome + valor). A soma dos opcionais será adicionada automaticamente ao valor total exibido na seção de Pagamento.

### Implementação

**1. Migração — nova coluna no banco**
- Adicionar `event_optionals JSONB DEFAULT '[]'` na tabela `company_events`
- Formato: `[{ "name": "Mesa de doces", "value": 350 }, { "name": "DJ", "value": 500 }]`

**2. Interface e estado no EventFormDialog**
- Nova interface `EventOptional { name: string; value: number | null }`
- Novo campo `event_optionals` em `EventFormData`
- Estado local `optionals` gerenciado via array com add/remove/update
- Nova seção visual entre "Aniversariante & Extras" e "Pagamento", com ícone e título "Opcionais"
- Cada item: inputs de nome e valor (MoneyInput) + botão remover (X)
- Botão "+ Adicionar opcional" abaixo da lista

**3. Cálculo automático do valor total**
- O campo "Valor total" na seção Pagamento será calculado como: `valor do pacote + soma dos opcionais`
- Quando o usuário alterar o valor do pacote ou adicionar/remover/editar opcionais, o valor total será recalculado automaticamente
- O campo "Valor do pacote" permanece editável manualmente; o "Valor total" passa a ser exibido como soma (pacote + opcionais), mas ainda permite override manual
- Exibir um subtotal dos opcionais abaixo da lista para transparência

**4. Persistência no Agenda.tsx**
- Incluir `event_optionals` no payload de leitura e gravação
- Mapear de volta ao formulário na edição (`mapEventToFormData`)

**5. Arquivos afetados**
- `supabase/migrations/` — nova migração
- `src/components/agenda/EventFormDialog.tsx` — UI + estado + cálculo
- `src/pages/Agenda.tsx` — payload de leitura/gravação

### Fluxo Visual

```text
┌─────────────────────────────────────────────┐
│ 📦 OPCIONAIS                               │
├─────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐│
│ │ Nome: [Mesa de doces   ] Valor: [R$ 350]││
│ │                                     [X] ││
│ └──────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────┐│
│ │ Nome: [DJ              ] Valor: [R$ 500]││
│ │                                     [X] ││
│ └──────────────────────────────────────────┘│
│         [+ Adicionar opcional]              │
│                                             │
│ Subtotal opcionais: R$ 850,00               │
└─────────────────────────────────────────────┘
│                                             │
│ 💳 PAGAMENTO                                │
│ Valor do pacote: R$ 3.000   Valor total:    │
│                              R$ 3.850       │
└─────────────────────────────────────────────┘
```

