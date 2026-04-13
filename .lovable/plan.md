

## Problema Identificado

Quando o lead informa X convidados na qualificação do bot, e depois fecha a festa com Y convidados, o contrato continua mostrando X porque as variáveis `{{convidados}}` e `{{quantidade_pessoas}}` priorizam os dados do lead sobre os dados do evento.

**Causa raiz** no arquivo `src/lib/template-resolver.ts`:

```text
ATUAL (errado):
  convidados  → lead.guests  ||  event.guest_count
  quantidade_pessoas  → contract.quantidade_pessoas  ||  lead.guests  ||  event.guest_count

CORRETO:
  convidados  → event.guest_count  ||  lead.guests
  quantidade_pessoas  → contract.quantidade_pessoas  ||  event.guest_count  ||  lead.guests
```

## Plano

### Arquivo: `src/lib/template-resolver.ts`

1. **Variavel `convidados` (linha 211-212)**: Inverter prioridade -- evento primeiro, lead como fallback.

2. **Variavel `quantidade_pessoas` (linha 366-368)**: Inverter prioridade -- contrato primeiro, depois evento, depois lead como fallback.

Isso garante que, se o evento tem `guest_count` preenchido (formulario da festa), esse valor prevalece. Se nao tem, cai para o valor do lead (qualificacao do bot).

### Impacto
- Apenas 2 linhas alteradas
- Nenhuma mudanca no banco de dados
- Corrige o comportamento para todos os contratos futuros
- Contratos ja gerados nao sao afetados (conteudo congelado)

