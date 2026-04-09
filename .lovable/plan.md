

## Modal de Detalhes do Lead nos Follow-ups

### Problema
Atualmente, os cards de lead no kanban de Follow-ups nao abrem nenhum modal com detalhes — so tem o botao de chat e o resumo IA inline. O usuario quer clicar no card e ver informacoes do lead + timeline de historico.

### Plano

**Arquivo:** `src/components/inteligencia/FollowUpsTab.tsx`

1. **Adicionar estado para o modal**: criar state `selectedLeadId` para controlar qual lead esta com o sheet aberto.

2. **Tornar o card clicavel**: adicionar `onClick` no div do card que seta o `selectedLeadId`, com `cursor-pointer`.

3. **Criar componente `FollowUpLeadDetailSheet`** (novo arquivo `src/components/inteligencia/FollowUpLeadDetailSheet.tsx`):
   - Recebe `leadId`, `isOpen`, `onClose`
   - Busca dados completos do lead em `campaign_leads` (name, whatsapp, status, unit, created_at, observacoes, etc.)
   - Busca historico em `lead_history` ordenado por `created_at desc`
   - Exibe em um `Sheet` (lateral direito) com:
     - **Cabecalho**: nome, telefone, status badge, unidade, score/temperatura
     - **Secao de info**: data de criacao, observacoes, data do follow-up enviado
     - **Botao WhatsApp**: navega para `/atendimento?phone=...`
     - **Resumo IA**: reutiliza `InlineAISummary`
     - **Timeline de historico**: lista cronologica com icones por tipo de acao (follow-up, mudanca de status, etc.), data formatada em pt-BR, similar ao que ja existe no `LeadDetailSheet`

4. **Renderizar o sheet no `FollowUpsTab`**: montar `<FollowUpLeadDetailSheet>` no final do JSX, passando o lead selecionado.

### Detalhes tecnicos

- Reutiliza o pattern de timeline do `LeadDetailSheet` existente (linhas ~460-560) mas simplificado, sem edicao
- Query de historico: `supabase.from("lead_history").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50)`
- O `onClick` do card nao deve conflitar com o botao de chat (ja tem `stopPropagation` implicito por ser um `Button`)
- Componente read-only — sem edicao de status ou responsavel, apenas visualizacao e navegacao

