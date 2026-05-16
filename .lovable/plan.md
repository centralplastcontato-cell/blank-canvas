Vou tratar isso como um problema geral do fluxo financeiro, não como caso isolado de uma festa.

Plano de correção:

1. Centralizar a regra de cartão sem antecipação
- Criar/usar uma lógica única para detectar saldo em cartão de crédito sem antecipação.
- Quando `saldo_forma` for cartão de crédito, `parcelas > 1`, operadora existir e `antecipado = false`, gerar N registros em `event_payments`, um para cada parcela líquida.
- Manter cartão antecipado e débito como parcela única líquida.

2. Corrigir o auto-sync do card lateral
- Ajustar `EventFinancialTab`, que é o componente do menu/card lateral, porque hoje ele ainda recria saldo de cartão como uma única linha e não divide as parcelas quando não há pagamentos cadastrados.
- Fazer esse auto-sync respeitar a mesma regra usada ao salvar a festa.
- Isso cobre festas antigas ou telas que entram no financeiro antes/depois do salvamento completo.

3. Evitar que o ajuste pós-contrato mascare o problema
- Alterar o fallback que cria `Adicional - Ajuste pós-contrato` para não criar um ajuste quando a diferença vem de saldo em cartão sem antecipação ainda não sincronizado.
- Assim, o sistema não troca as parcelas reais por uma linha genérica.

4. Corrigir variações de forma de pagamento
- Garantir compatibilidade com os valores usados no projeto: `cartao`, `cartao_credito` e `cartao_debito`.
- Ajustar os pontos onde a UI só reconhece `cartao`, para não falhar quando o valor salvo for `cartao_credito`.

5. Validar com o comportamento esperado
- Cenário A: saldo em PIX/boleto/dinheiro com parcelas deve aparecer no lateral como parcelas normais.
- Cenário B: saldo em cartão de crédito com antecipação deve aparecer como uma única parcela líquida.
- Cenário C: saldo em cartão de crédito sem antecipação deve aparecer no lateral como N parcelas mensais líquidas, com data baseada no prazo de recebimento da operadora.

Resumo visual/funcional esperado após a implementação:
- Antes: ao selecionar cartão crédito sem antecipação, as parcelas sumiam ou viravam um único ajuste.
- Depois: ao selecionar cartão crédito sem antecipação, o lateral mostra as parcelas reais da operadora, uma por mês, com valor líquido e identificação de cartão sem antecipação.