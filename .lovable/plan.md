
## Corrigir Metricas do Resumo Diario

### Problema 1: Visitas agendadas = 0 (deveria ser pelo menos 1)
A metrica de "Visitas agendadas" so conta eventos `status_change` com `new_value = 'em_contato'` na tabela `lead_history`. Porem, a Janaina tem status `em_contato` no banco mas nao existe um registro de `status_change` no historico para ela. A mudanca de status aconteceu sem gerar o evento no historico.

**Correcao**: Alem de contar eventos de `status_change` no historico, tambem contar leads cujo status atual (`campaign_leads.status`) e `em_contato`, garantindo que nenhuma visita seja perdida.

### Problema 2: Os numeros nao batem (24 leads, mas 22 + 6 + 5 = 33)
As categorias estao sobrepostas. "Orcamentos" conta qualquer lead que chegou ate `proximo_passo` ou `complete_final`. Depois, "Vao pensar" e "Querem humano" contam pela escolha do `proximo_passo` — mas esses leads JA estao incluidos nos 22 orcamentos. Isso confunde porque parece que sao categorias exclusivas.

**Correcao**: Reestruturar as metricas para serem mutuamente exclusivas e refletir o funil real:

```text
24 leads novos
 |
 +-- 1 nao completou o fluxo do bot
 +-- 1 trabalhe conosco
 +-- 1 fornecedor
 +-- 8 ainda em "novo" (aguardando no bot)
 +-- 13 aguardando_resposta (em negociacao)
 |    +-- desses, X agendaram visita, Y vao pensar, Z querem humano
```

A abordagem mais clara: "Visitas agendadas" deve contar leads com `proximo_passo = 1` OU status `em_contato`. "Vao pensar" conta `proximo_passo = 3`. "Querem humano" conta `proximo_passo = 2`. Estas 3 categorias sao mutuamente exclusivas (cada lead escolhe UM proximo passo). "Orcamentos" passa a contar apenas os que receberam o PDF/link (ou seja, leads que passaram por `proximo_passo` ou `complete_final`), e fica como metrica independente de "quantos receberam material".

### Mudancas tecnicas

**Arquivo: `supabase/functions/daily-summary/index.ts`**

1. **Visitas**: Alem dos eventos `status_change -> em_contato` no historico, verificar tambem:
   - Leads com `bot_data.proximo_passo = '1'` ou `'Agendar visita'`
   - Leads com status atual `em_contato`
   
2. **Garantir exclusividade nos contadores de decisao**:
   - `querPensar`: contar apenas `proximo_passo = '3'` ou variantes textuais ("Analisar com calma")
   - `querHumano`: contar apenas `proximo_passo = '2'` ou variantes textuais ("Tirar duvidas")  
   - `visitas` (novo calculo): contar `proximo_passo = '1'` ou variantes textuais ("Agendar visita") OU status `em_contato`
   - Usar um Set de lead IDs para cada categoria para evitar contagem dupla

3. **Orcamentos**: Manter como esta (total de leads que receberam material), mas deixar claro que e uma metrica de volume independente, nao de classificacao

### Resultado esperado
Para o dia 14/02 com os dados reais:
- 24 Leads novos
- 1 Visita agendada (Janaina, que tem status em_contato)
- 22 Orcamentos (quem recebeu material - metrica de volume)
- 6 Vao pensar (proximo_passo = Analisar com calma)
- 5 Querem humano (proximo_passo = Tirar duvidas)
- 0% Taxa conversao
- 1 Nao completaram
