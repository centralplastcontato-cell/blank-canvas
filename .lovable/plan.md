

## Resumo da Festa — Painel consolidado no lateral do evento

### O que será feito

Criar um novo componente `EventSummaryPanel` que aparecerá no painel lateral do evento (`EventDetailSheet`), logo acima do Checklist existente. Ele consolida todas as informações-chave da festa em um único card visual, incluindo um campo editável para anotações adicionais.

### Informações exibidas no painel

1. **Aniversariante(s)** — nome e idade (de `birthday_children` ou `child_name`/`child_age`)
2. **Pais / Contratante** — `parent_names` ou nome do lead vinculado
3. **Pacote** — `package_name`
4. **Convidados** — `guest_count`
5. **Horário** — `start_time` / `end_time`
6. **Unidade** — `unit`
7. **Opcionais** — lista de `event_optionals` (nome + valor)
8. **Observações do evento** — `notes` (campo existente do modal)
9. **Observações internas** — `internal_notes`
10. **Campo editável** — textarea para o usuário escrever anotações rápidas diretamente no painel (salva em `internal_notes` do evento)

### Etapas técnicas

#### 1. Expandir a interface `EventData` em `EventDetailSheet.tsx`
Adicionar os campos que faltam: `child_name`, `child_age`, `birthday_children`, `parent_names`, `event_optionals`, `internal_notes`, `gifts`.

#### 2. Criar o componente `src/components/agenda/EventSummaryPanel.tsx`
- Recebe `event` (com os campos expandidos), `leadName`, e `companyId`
- Renderiza um card `rounded-xl` com header "Resumo da Festa" e ícone `FileText`
- Seções com ícones: aniversariante, pais, pacote, convidados, opcionais, observações
- Textarea para anotações internas com auto-save (debounce 2s para `company_events.internal_notes`)
- Visual consistente com os outros cards do painel (mesmo padrão de `bg-muted/30`, `border-border/40`)

#### 3. Inserir o `EventSummaryPanel` no `EventDetailSheet.tsx`
- Posicionar entre "Informações Adicionais" e o Checklist
- Passar os dados do evento expandido

#### 4. Nenhuma alteração necessária em `Agenda.tsx` ou `AgendaTudoTab.tsx`
Os campos já são carregados do banco e passados via `CompanyEvent` — o TypeScript só precisa que `EventData` aceite os mesmos campos.

### Arquivo novo
- `src/components/agenda/EventSummaryPanel.tsx`

### Arquivos alterados
- `src/components/agenda/EventDetailSheet.tsx` — expandir interface + inserir o painel

### Resultado esperado
Ao abrir o painel lateral de qualquer festa, o usuário verá um card "Resumo da Festa" com todas as informações consolidadas, incluindo um campo para escrever anotações que salva automaticamente.

