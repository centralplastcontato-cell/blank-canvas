

# Salvar Resumo IA no Banco de Dados

## O que muda
Atualmente o resumo da IA e gerado sob demanda e perdido ao fechar o painel. Com essa mudanca, o resumo sera salvo na tabela `lead_intelligence` (que ja existe e tem relacao 1:1 com o lead), evitando chamadas desnecessarias a IA e mantendo o historico.

## Como vai funcionar
1. Ao clicar em "Gerar", a edge function gera o resumo e salva no banco
2. Ao abrir um lead que ja tem resumo salvo, ele aparece automaticamente (sem precisar clicar em "Gerar")
3. O botao muda para "Atualizar" quando ja existe resumo
4. Data/hora da ultima geracao aparece no card

## Etapas tecnicas

### 1. Migracaco: adicionar colunas em `lead_intelligence`
Adicionar 3 colunas na tabela existente `lead_intelligence`:
- `ai_summary` (text, nullable) - o resumo gerado
- `ai_next_action` (text, nullable) - a sugestao de proxima acao
- `ai_summary_at` (timestamptz, nullable) - quando o resumo foi gerado

Nao precisa de novas tabelas nem RLS (a tabela ja tem policies corretas por company).

### 2. Atualizar Edge Function `lead-summary`
**Arquivo:** `supabase/functions/lead-summary/index.ts`

Apos gerar o resumo com sucesso, salvar na tabela `lead_intelligence`:
- UPDATE em `lead_intelligence` SET `ai_summary`, `ai_next_action`, `ai_summary_at = now()` WHERE `lead_id = ?`
- Se nao existir registro em `lead_intelligence`, fazer INSERT (upsert)

### 3. Atualizar hook `useLeadSummary`
**Arquivo:** `src/hooks/useLeadSummary.ts`

- Ao inicializar (quando `leadId` muda), buscar o resumo salvo em `lead_intelligence` (campos `ai_summary`, `ai_next_action`, `ai_summary_at`)
- Se existir resumo salvo, preencher o estado automaticamente (sem precisar chamar a edge function)
- `fetchSummary` continua funcionando para regenerar/atualizar

### 4. Atualizar UI no `LeadDetailSheet.tsx`
**Arquivo:** `src/components/admin/LeadDetailSheet.tsx`

- Mostrar a data/hora do ultimo resumo abaixo do card (ex: "Gerado em 13/02 as 14:30")
- Se ja tem resumo salvo, mostrar direto sem precisar clicar em "Gerar"
- Botao sempre mostra "Atualizar" quando ja tem resumo

### Arquivos modificados
| Arquivo | Acao |
|---------|------|
| Migracao SQL | Adicionar 3 colunas em `lead_intelligence` |
| `supabase/functions/lead-summary/index.ts` | Salvar resumo no banco apos gerar |
| `src/hooks/useLeadSummary.ts` | Carregar resumo salvo ao abrir lead |
| `src/components/admin/LeadDetailSheet.tsx` | Mostrar data do resumo, carregar automatico |

