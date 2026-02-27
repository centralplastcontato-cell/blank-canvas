
## Atualizar o Guia de Inteligencia

O guia atual cobre apenas Score, Temperatura, Cards de Prioridade, Funil e Alertas. Faltam secoes importantes sobre as abas e funcionalidades adicionadas desde sua criacao.

### O que esta faltando

1. **Resumo do Dia** -- aba principal com metricas diarias, timeline de eventos, insights da IA e contexto personalizavel
2. **Follow-ups** -- Kanban de 4 colunas com delays dinamicos por unidade
3. **Leads do Dia** -- lista de leads criados hoje com score e acoes rapidas
4. **Resumo IA por lead** -- botao "Resumo IA" em cada lead que gera resumo, proxima acao e mensagem sugerida via gpt-4o-mini
5. **Contexto da IA** -- campo editavel pelo admin para personalizar os insights com dados do buffet (ticket medio, unidades, etc.)

### O que sera feito

Atualizar o conteudo do Dialog em `src/pages/Inteligencia.tsx` (linhas 268-349) para incluir todas as secoes, reorganizando na ordem das abas:

```text
1. Score (0-100)          -- manter como esta
2. Temperatura            -- manter como esta
3. Resumo do Dia (NOVO)   -- metricas, timeline, insights IA, contexto personalizavel, selecao de periodo
4. Prioridades            -- renomear de "Cards de Prioridade", manter conteudo
5. Follow-ups (NOVO)      -- Kanban 4 colunas, delays dinamicos, botao WhatsApp
6. Funil de Conversao     -- manter como esta
7. Leads do Dia (NOVO)    -- leads criados hoje, exportacao
8. Resumo IA (NOVO)       -- resumo individual por lead, proxima acao, mensagem sugerida, copiar
9. Alertas em Tempo Real  -- manter como esta
```

### Detalhes tecnicos

**Arquivo editado:** `src/pages/Inteligencia.tsx` (somente o conteudo dentro do `<DialogContent>`, linhas 268-349)

Nenhum arquivo novo, nenhuma dependencia adicional. Apenas atualizacao de texto e adicao de novos blocos de JSX seguindo o mesmo padrao visual (icone + titulo + descricao) ja utilizado nas secoes existentes.

Icones adicionais que ja estao importados no arquivo: `BarChart3`, `Clock`, `MessageCircle`, `Sparkles`, `Brain`.
