
## Fase 1: Reordenação Visual das Colunas do Kanban

### O que será alterado

Apenas **1 arquivo**, **1 trecho de código**: o array `columns` dentro de `src/components/admin/LeadsKanban.tsx`.

### Situação atual (linhas 42–52)

```text
"novo"
"trabalhe_conosco"      ← fora do lugar (2ª posição)
"em_contato"
"orcamento_enviado"
"aguardando_resposta"
"fechado"
"perdido"
"transferido"
"fornecedor"
```

O `trabalhe_conosco` está na 2ª posição, quebrando o fluxo comercial.

### Situação desejada

```text
1) "novo"               → Novo
2) "em_contato"         → Visita
3) "aguardando_resposta"→ Negociando
4) "orcamento_enviado"  → Orçamento enviado
5) "fechado"            → Fechado
6) "perdido"            → Perdido
7) "transferido"        → Transferência
8) "trabalhe_conosco"   → Trabalhe Conosco
9) "fornecedor"         → Fornecedor
```

### Impactos colaterais automáticos (sem código extra)

- **`getPreviousStatus` e `getNextStatus`**: derivam do mesmo array `columns`, então as setas de navegação nos cards do Kanban vão seguir a nova ordem automaticamente.
- **Drag & drop**: a regra de bloqueio "não pode voltar para novo" continua funcionando (verifica `status === "novo"`, não índice).
- **Mobile**: a navegação por setas e os dots de página vão seguir a nova ordem automaticamente.
- **Nenhum valor de banco**, enum, automação de bot, follow-up ou label de interface é tocado.

### O que NÃO muda

- Valores internos no banco (`lead_status` enum do Postgres)
- Labels exibidos na interface (`LEAD_STATUS_LABELS` em `src/types/crm.ts`)
- Cores dos status (`LEAD_STATUS_COLORS`)
- Lógica do bot (`wapi-webhook`)
- Follow-ups automáticos
- Componente `KanbanCard`, `UnitKanbanTabs`, `LeadDetailSheet` ou qualquer outra página

### Arquivo alterado

| Arquivo | Linha | Alteração |
|---|---|---|
| `src/components/admin/LeadsKanban.tsx` | 42–52 | Reordenar array `columns` |
