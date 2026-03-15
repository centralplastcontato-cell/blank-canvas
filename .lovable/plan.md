

## Plano: Busca de festas por nome ou telefone do lead

### Problema
Atualmente a Agenda não possui campo de busca. O usuário precisa navegar mês a mês para encontrar uma festa específica. A solicitação é buscar festas pelo nome ou telefone do lead vinculado.

### Abordagem

**1. Adicionar campo de busca na Agenda**
- Input de busca no header mobile e desktop da página `Agenda.tsx`
- Placeholder: "Buscar por nome ou telefone do lead..."
- Ícone de Search + botão de limpar

**2. Lógica de busca (cross-month)**
- Quando o usuário digita (debounce 400ms), executar query no Supabase buscando em `campaign_leads` pelo termo (nome via `ilike` ou telefone via `ilike`)
- Com os `lead_id`s encontrados, buscar `company_events` vinculados
- Exibir resultados em uma lista separada (sobrepondo a visão de calendário enquanto houver texto no campo)
- Ao clicar em um resultado, abrir o `EventDetailSheet` normalmente

**3. Query**
```sql
-- Buscar leads que batem com o termo
campaign_leads.name ilike '%termo%' OR campaign_leads.whatsapp ilike '%termo%'

-- Depois buscar eventos vinculados
company_events.lead_id IN (ids encontrados)
```

Alternativamente, fazer tudo no frontend com uma única query encadeada.

**4. UI dos resultados**
- Lista simples mostrando: título da festa, data, nome do lead, telefone
- Badge de status (confirmado/pendente/cancelado)
- Ao limpar a busca, voltar para a visão normal do calendário

### Arquivos alterados
- `src/pages/Agenda.tsx` — adicionar estado de busca, input, lógica de query e renderização dos resultados

### Escopo restrito
- Não altera calendário, formulários, checklist ou qualquer outra funcionalidade
- Mobile-first: input empilhado acima do calendário

