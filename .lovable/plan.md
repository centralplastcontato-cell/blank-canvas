

## Corrigir discrepância Métricas vs Kanban CRM

### Problema
Os cards de métricas mostram **40 Fechados** (contagem real do banco), mas o Kanban CRM mostra apenas **1 lead** na coluna "Fechado". Isso acontece porque o Kanban recebe os mesmos leads paginados da tabela (50 por página, ordenados por data), e na página atual só 1 lead "fechado" aparece.

### Solução
Quando o usuário estiver na **aba CRM (Kanban)**, carregar **todos os leads sem paginação**, para que todas as colunas reflitam os números reais. A paginação continua ativa nas abas **Leads (tabela)** e **Lista**.

### Alterações Técnicas

**Arquivo: `src/pages/CentralAtendimento.tsx`**

1. **Detectar aba ativa**: Quando `activeTab === "crm"`, buscar leads sem `.range()` (sem paginação), para que o Kanban receba todos os leads disponíveis.

2. **Ajustar a query `fetchLeads`**:
   - Se a aba ativa for `"crm"`, remover o `.range(from, to)` da query
   - Manter a paginação normalmente para as abas "leads" e "lista"
   - Adicionar um limite de seguranca (ex: 2000 leads) para evitar sobrecarga

3. **Dependência no useEffect**: Adicionar `activeTab` como dependência do useEffect de `fetchLeads`, para refazer a busca quando trocar de aba.

### Resultado esperado
- Kanban mostrará **40 leads** na coluna "Fechado" (correspondendo aos cards de métricas)
- Tabela de leads continua com paginação de 50 por página
- Performance preservada com limite de segurança

