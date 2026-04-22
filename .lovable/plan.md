

# Plano: Detalhes Expandidos no Card de Consentimento

## Resumo
Ao clicar no card de consentimento, expandir uma seção com informações adicionais: nome da festa, tipo de evento, data da festa e banco selecionado para baixa.

## Como vai funcionar
- O card terá um comportamento de "expandir/recolher" ao clicar na area do card (fora dos botoes)
- Quando expandido, mostra: nome da festa, tipo de evento, data da festa e nome do banco
- Os dados extras serao carregados via join no hook `useFinancialConsent`

## Alteracoes

### 1. Atualizar `useFinancialConsent.ts` — enriquecer dados pendentes
Na funcao `fetchPending`, fazer joins para buscar dados do evento e do banco:
- Join `event_payments` para pegar `event_id`
- Join `company_events` para pegar `title`, `event_type`, `event_date`
- Join `company_bank_accounts` para pegar o nome do banco a partir do `payload->bank_account_id`
- Adicionar campos `event_title`, `event_type`, `event_date`, `bank_account_name` na interface `FinancialConsent`

### 2. Atualizar `ConsentCard.tsx` — seção expandível
- Adicionar estado `expanded` (toggle ao clicar no card)
- Quando expandido, mostrar seção com:
  - Nome da festa (ex: "Antonella 2 anos")
  - Tipo do evento (ex: "Aniversário")
  - Data da festa (ex: "26/04/2026")
  - Banco selecionado (ex: "Infinity Pay")
- Icone de seta (chevron) indicando que é expansível
- Animação suave de abertura/fechamento

### Arquivos modificados
- `src/hooks/useFinancialConsent.ts`
- `src/components/financial/ConsentCard.tsx`

