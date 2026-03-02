

## Corrigir metricas e mostrar mensagem enviada no detalhe da campanha

### Problema diagnosticado

A campanha "Ferias de Julho" mostra Total=1 mas 0 enviados/erros/pendentes porque os registros de destinatarios nunca foram inseridos na tabela `campaign_recipients` (erro de UUID com prefixo `base_` -- ja corrigido). O dialogo de envio carregou 0 pendentes e marcou a campanha como "completed" sem enviar.

Para campanhas futuras, o bug de insercao ja esta corrigido. Mas o sheet de detalhes precisa de duas melhorias:

### Mudancas

**1. Metricas consistentes no CampaignDetailSheet**

Quando a lista de destinatarios esta vazia mas a campanha tem `total_recipients > 0`, exibir uma mensagem explicativa ao inves de "Nenhum destinatario", informando que os dados de destinatarios nao estao disponiveis (possivelmente por erro na criacao).

**2. Mostrar qual mensagem cada lead recebeu**

Adicionar ao `CampaignDetailSheet` a exibicao da mensagem enviada para cada destinatario:
- Buscar tambem o campo `variation_index` na query de recipients
- Usar o `campaign.message_variations[variation_index]` para resolver o texto da mensagem
- Exibir abaixo do nome/telefone de cada destinatario um trecho da mensagem (truncado) com opcao de expandir via tooltip ou clique

**Arquivo: `src/components/campanhas/CampaignDetailSheet.tsx`**

Alteracoes:
- Adicionar `variation_index` na interface `Recipient` e na query do Supabase (linha 74)
- Passar `campaign.message_variations` para o `RecipientRow`
- No `RecipientRow`, resolver a variacao e exibir o texto da mensagem (com `{nome}` substituido pelo `lead_name`)
- Exibir texto truncado com tooltip para ver a mensagem completa
- Quando `recipients.length === 0` e `campaign.total_recipients > 0`, mostrar mensagem explicativa: "Dados de destinatarios indisponiveis. Possivelmente houve um erro na criacao desta campanha."

### Layout atualizado do RecipientRow

```text
+------------------------------------------+
| Joao Silva                    ✓ Enviado  |
| +55 (11) 99999-9999                      |
| "Ola Joao! Aproveite nossa promo..."     |
+------------------------------------------+
```

A mensagem aparecera em texto pequeno (text-xs), cor muted, truncada com tooltip para ver completa.
