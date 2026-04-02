

## Múltiplos Aniversariantes por Festa

### Problema
Atualmente o formulário suporta apenas um aniversariante (nome, idade, data de nascimento). Festas com irmãos, primos ou amigos comemorando juntos não conseguem registrar todos.

### Solução
Transformar a seção "Aniversariante" em uma lista dinâmica onde o usuário pode adicionar quantos aniversariantes precisar, cada um com nome, idade e data de nascimento. Um botão "+ Adicionar aniversariante" permite incluir mais entradas.

### Implementação

**1. Nova coluna no banco (migração)**
- Adicionar coluna `birthday_children JSONB DEFAULT '[]'` na tabela `company_events`
- Formato: `[{ "name": "João", "age": "5 anos", "birthdate": "2021-03-15" }]`

**2. Backward compatibility**
- Na leitura, se `birthday_children` estiver vazio/null mas `child_name` existir, montar o array a partir dos campos legados (`child_name`, `child_age`, `child_birthdate`)
- Na gravação, salvar sempre em `birthday_children` e manter os campos legados preenchidos com o primeiro aniversariante (para buscas e relatórios existentes)

**3. UI no EventFormDialog**
- Substituir os 3 campos fixos por uma lista renderizada via `.map()` sobre o array de aniversariantes
- Cada item: card com Nome, Idade, Data de nascimento + botão de remover (X)
- Botão "+ Adicionar aniversariante" abaixo da lista
- Mínimo de 1 aniversariante sempre visível (sem botão de remover no primeiro se for o único)

**4. Arquivos afetados**
- `supabase/migrations/` — nova migração para coluna `birthday_children`
- `src/components/agenda/EventFormDialog.tsx` — UI da lista dinâmica + estado
- `src/pages/Agenda.tsx` — incluir `birthday_children` no payload de leitura/gravação

### Fluxo Visual

```text
┌─────────────────────────────────────────────┐
│ 🎂 ANIVERSARIANTE & EXTRAS                 │
├─────────────────────────────────────────────┤
│ ┌─ Aniversariante 1 ─────────────────────┐  │
│ │ Nome: [João       ]  Idade: [5 anos  ] │  │
│ │ Nascimento: [15/03/2021]           [X] │  │
│ └────────────────────────────────────────┘  │
│ ┌─ Aniversariante 2 ─────────────────────┐  │
│ │ Nome: [Maria      ]  Idade: [3 anos  ] │  │
│ │ Nascimento: [22/07/2023]           [X] │  │
│ └────────────────────────────────────────┘  │
│         [+ Adicionar aniversariante]        │
│                                             │
│ Responsáveis                                │
│ ...                                         │
└─────────────────────────────────────────────┘
```

