

## Contextualizar a IA para o Mercado de Buffet Infantil

### Problema
O "Insight da IA" gera analises alarmistas (ex: "taxa de conversao 0%, necessidade de analise profunda") porque nao entende que buffet infantil tem um ciclo de venda naturalmente longo. Os pais pesquisam varios buffets, agendam visitas, pedem orcamentos e demoram dias/semanas para fechar. Isso e normal e nao deveria ser tratado como problema.

### Solucao

**Duas frentes complementares:**

1. **Enriquecer o prompt da IA com contexto do setor** -- adicionar instrucoes fixas explicando como funciona o mercado de buffet infantil
2. **Campo customizavel por empresa** -- permitir que cada buffet adicione seu proprio contexto (ex: "nossa taxa media de conversao e 8%", "nosso ticket medio e R$3.500")

---

### Mudancas tecnicas

**1. Arquivo: `supabase/functions/daily-summary/index.ts` (prompt da IA, linhas ~397-417)**

Substituir o prompt atual por um enriquecido com contexto do setor:

```text
Antes:
  "Voce e um assistente de vendas de buffet infantil. Analise os dados..."

Depois:
  "Voce e um consultor especialista no mercado de buffet de festas infantis.

  CONTEXTO IMPORTANTE DO SETOR:
  - O ciclo de venda de buffet infantil e naturalmente longo (dias a semanas)
  - Os pais pesquisam varios buffets antes de decidir
  - E normal receber muitos leads e orcamentos com poucos fechamentos no mesmo dia
  - Uma taxa de conversao de 5-15% sobre o total de leads e considerada saudavel
  - O volume de leads novos e orcamentos enviados sao indicadores positivos de demanda
  - 'Quer pensar' nao e negativo -- faz parte do processo natural de decisao
  - O foco deve ser em nutrir o relacionamento, nao pressionar
  
  [contexto customizado da empresa, se houver]

  Analise os dados com essa perspectiva realista do setor..."
```

**2. Novo campo `ai_context` na tabela `wapi_bot_settings`**

Adicionar um campo de texto onde cada empresa pode inserir contexto proprio para a IA. Exemplos:
- "Nossa taxa media de conversao e 10%"
- "Temos 2 unidades e atendemos em media 80 festas/mes"
- "Nosso ticket medio e R$4.000"

O prompt da IA incluira esse texto quando disponivel.

**3. Arquivo: `src/components/whatsapp/settings/AdvancedSection.tsx` (ou nova secao)**

Adicionar um campo de texto nas Configuracoes do WhatsApp para o buffet preencher o contexto personalizado da IA.

---

### Resultado esperado

**Antes (IA generica):**
> "Taxa de conversao 0%, necessidade de analise profunda no processo de abordagem"

**Depois (IA contextualizada):**
> "Dia forte com 25 novos leads demonstrando boa demanda. 9 orcamentos enviados e um excelente indicador -- esses leads estao no processo natural de decisao. Foco: nutrir os que pediram para pensar e agendar visitas para os mais engajados."

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/daily-summary/index.ts` | Prompt enriquecido + leitura do campo `ai_context` |
| `src/components/whatsapp/settings/AdvancedSection.tsx` | Novo campo "Contexto para a IA" |

