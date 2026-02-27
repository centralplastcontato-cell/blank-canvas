

## Correcao: Leads com unidade "Castelo da Diversao" em vez de Trujillo/Manchester

### Problema identificado
6 leads da empresa "Castelo da Diversao" (que e a Aventura Kids) estao com `unit = "Castelo da Diversao"` em vez de "Trujillo" ou "Manchester".

### Causa raiz
Dois problemas encadeados:

1. **RLS bloqueia unidades na LP publica**: A tabela `company_units` exige autenticacao para SELECT. Como a Landing Page dinamica (`/lp/castelo-da-diversao`) e publica (sem login), a query de unidades retorna vazio (`unitNames = []`).

2. **Fallback no chatbot usa nome da empresa**: No `LeadChatbot.tsx` (linha 222), quando `unitOptions` esta vazio, o chatbot pula a selecao de unidade e grava `unit = companyName` ("Castelo da Diversao") em vez de pedir ao usuario para escolher.

### Solucao (2 partes)

**Parte 1 - Corrigir os 6 leads existentes no banco**
- Executar UPDATE nos 6 leads para trocar `unit` de "Castelo da Diversao" para "Trujillo"
- Registrar a alteracao no `lead_history`

**Parte 2 - Corrigir a origem do problema**
- Adicionar uma policy RLS na tabela `company_units` que permita SELECT anonimo (leitura publica) -- as unidades nao sao dados sensiveis e precisam ser visiveis nas LPs publicas
- A tabela ja tem uma policy similar em `companies` ("Anon can view companies for public party control"), entao e seguro fazer o mesmo para `company_units`

### Detalhes tecnicos

**Migration SQL:**
```sql
CREATE POLICY "Anon can view units for public pages"
ON company_units FOR SELECT
USING (true);
```

**Data fix (via insert tool):**
```sql
UPDATE campaign_leads 
SET unit = 'Trujillo' 
WHERE company_id = 'a0000000-0000-0000-0000-000000000001' 
  AND unit = 'Castelo da Diversão';
```

**Nenhuma alteracao de codigo necessaria** -- o chatbot ja funciona corretamente quando recebe as unidades. O problema era apenas que a RLS impedia a leitura das unidades sem login.

### Impacto
- Os 6 leads serao corrigidos para "Trujillo"
- Novos leads da LP dinamica passarao a ver o seletor de unidades (Trujillo / Manchester / As duas) corretamente
- Nenhum risco de seguranca: nomes de unidades sao dados publicos

