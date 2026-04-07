

# Plano: Expandir o Onboarding com Seções Operacionais (Opcionais)

## Contexto

O formulário de onboarding atual (7 steps) coleta informações sobre identidade, contato, operação, tráfego, WhatsApp, marca e objetivos. A ideia é adicionar novas seções **opcionais** onde o cliente pode preencher dados operacionais da plataforma (pacotes, tipos de festa, unidades, horários, etc.), facilitando a implementação. Tudo opcional -- se não preencher, não bloqueia. No final, os dados preenchidos geram um relatório/resumo mais completo.

## O que será adicionado

### Novas seções opcionais (Steps 8-10, total 10 steps)

**Step 8 -- Tipos de Festa e Pacotes** (opcional)
- Tipos de festa que o buffet oferece (campo dinâmico: adicionar/remover)
- Pacotes com nome e valor base (campo dinâmico: adicionar/remover)
- Faixas de convidados que atendem (ex: 30, 50, 80, 100+)

**Step 9 -- Unidades e Horários** (opcional)
- Nomes das unidades (se marcou "múltiplas unidades" no step 5)
- Horários de festa padrão (ex: manhã 10h-13h, tarde 14h-18h, noite 19h-23h)
- Dias da semana que funcionam

**Step 10 -- Opcionais e Diferenciais** (opcional)
- Itens opcionais/extras que oferece (nome + valor, campo dinâmico)
- Diferenciais do buffet (texto livre)
- Informações para contrato (razão social, CNPJ, dados bancários -- tudo opcional)

### Alterações no banco de dados

- Adicionar coluna JSONB `operational_data` na tabela `company_onboarding` para armazenar todos os dados operacionais sem precisar de várias colunas novas
- Atualizar `TOTAL_STEPS` de 7 para 10

### Estrutura do `operational_data`
```text
{
  event_types: [{ value: string, label: string }],
  packages: [{ name: string, base_price: string }],
  guest_ranges: string[],
  units: [{ name: string }],
  party_schedules: [{ label: string, start: string, end: string }],
  working_days: string[],
  optionals: [{ name: string, value: string }],
  differentials: string,
  company_legal_name: string,
  cnpj: string,
  bank_info: string
}
```

### Relatório Hub (HubOnboarding)

- Na visualização do onboarding no Hub, exibir as seções operacionais preenchidas
- Na exportação PDF, incluir os dados operacionais

### Fluxo do cliente

1. Steps 1-7 funcionam exatamente como hoje
2. Ao chegar no step 7 (Objetivos), o botão muda de "Finalizar" para "Próximo"
3. Steps 8-10 mostram um badge "Opcional" no header
4. Em qualquer step opcional, o cliente pode clicar "Finalizar" para concluir sem preencher
5. Validação: nenhum campo é obrigatório nos steps 8-10

## Arquivos a modificar

1. **Migration SQL** -- adicionar coluna `operational_data jsonb` em `company_onboarding`
2. **`src/pages/Onboarding.tsx`** -- adicionar Steps 8, 9, 10 com campos dinâmicos; atualizar `TOTAL_STEPS` para 10; ajustar `saveProgress` e `handleSubmit` para incluir `operational_data`; footer mostra "Pular e Finalizar" nos steps opcionais
3. **`src/pages/HubOnboarding.tsx`** -- exibir dados operacionais no detail view e no PDF

