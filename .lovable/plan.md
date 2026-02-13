
# Indicador "Ultima atualizacao do score" na tela de Inteligencia

## O que muda
Adicionar um indicador discreto mostrando **quando o score de cada lead foi atualizado pela ultima vez**, usando o campo `updated_at` que ja existe na tabela `lead_intelligence` e ja esta disponivel no hook `useLeadIntelligence`.

## Onde aparece

### 1. Aba Prioridades (`PrioridadesTab.tsx`)
- No componente `LeadRow`, abaixo da linha "Ultima msg", adicionar uma linha com icone de relogio mostrando "Score atualizado ha X min/horas"
- Usa o campo `item.updated_at` com `formatDistanceToNow` (ja importado no arquivo)

### 2. Aba Leads do Dia (`LeadsDoDiaTab.tsx`)
- Adicionar uma nova coluna "Atualizado" na tabela
- Exibe o tempo relativo da ultima atualizacao do score

## Detalhes tecnicos

### Dados
- O campo `updated_at` ja existe em `LeadIntelligence` e ja e retornado pelo hook `useLeadIntelligence` -- nenhuma mudanca no banco ou no hook e necessaria

### PrioridadesTab.tsx
- Adicionar abaixo da linha de "Ultima msg" (linha ~37-41):
```text
<p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1">
  <RefreshCw className="h-3 w-3" />
  Score: {timeAgo(item.updated_at)}
</p>
```
- Importar `RefreshCw` do lucide-react

### LeadsDoDiaTab.tsx
- Adicionar coluna `Atualizado` ao `TableHeader`
- Adicionar `TableCell` com tempo relativo usando `formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: ptBR })`
- Importar `ptBR` de `date-fns/locale` e `formatDistanceToNow` de `date-fns`

## Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `src/components/inteligencia/PrioridadesTab.tsx` | Adicionar indicador de atualizacao no LeadRow |
| `src/components/inteligencia/LeadsDoDiaTab.tsx` | Adicionar coluna "Atualizado" na tabela |
