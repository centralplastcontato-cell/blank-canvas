

# Valor por Pessoa Adicional: Antecipado vs No Dia

## Resumo

Hoje o pacote tem um único campo `valor_pessoa_adicional` (ou separado criança/adulto). Muitos buffets cobram **preços diferentes** dependendo se o convidado extra foi confirmado com antecedência ou apareceu no dia do evento. Vamos adicionar essa distinção.

## O que muda

### 1. Banco de dados — Migration

Adicionar 2 novas colunas na tabela `company_packages`:
- `valor_adicional_antecipado` (numeric, nullable) — preço para pessoa adicional confirmada antes da festa
- `valor_adicional_no_dia` (numeric, nullable) — preço para pessoa adicional no dia do evento

Adicionar 2 novas colunas na tabela `company_events`:
- `extra_guest_value_antecipado` (numeric, nullable)
- `extra_guest_value_no_dia` (numeric, nullable)

As colunas existentes (`valor_pessoa_adicional`, `extra_guest_value`) continuam funcionando para quem não usa essa distinção.

### 2. Formulário de Pacotes (`PackagesManager.tsx`)

Quando **não** está em modo "preços separados" (criança/adulto):
- Substituir o campo único "Valor por pessoa adicional" por **dois campos** lado a lado:
  - "Antecipado (R$)" — valor quando confirmado antes
  - "No dia (R$)" — valor quando no dia do evento
- Manter o campo único como fallback se ambos estiverem vazios

Quando **está** em modo "preços separados":
- Adicionar os mesmos dois campos (antecipado/no dia) para cada categoria (criança e adulto), ou manter simples e só ter antecipado/no dia no modo unificado

### 3. Formulário de Evento (`EventFormDialog.tsx`)

- Ao selecionar pacote, auto-preencher os dois valores (antecipado e no dia)
- Mostrar os dois valores no info do pacote selecionado
- Salvar ambos na tabela `company_events`

### 4. Cards de Pacote (`PackagesManager.tsx`)

- Mostrar badges separados: "Antecipado: R$ X" e "No dia: R$ Y"

### 5. Variáveis de Contrato

Adicionar novas variáveis no template resolver:
- `{{valor_adicional_antecipado}}` — valor formatado
- `{{valor_adicional_no_dia}}` — valor formatado
- `{{valor_adicional_antecipado_extenso}}` — por extenso
- `{{valor_adicional_no_dia_extenso}}` — por extenso

Atualizar tanto `src/lib/template-resolver.ts` quanto `supabase/functions/_shared/template-resolver.ts`.

### 6. Contrato (`EventContractDialog.tsx`)

- Passar os dois novos valores no snapshot do contrato

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| Nova migration SQL | Adicionar 4 colunas (2 em `company_packages`, 2 em `company_events`) |
| `src/integrations/supabase/types.ts` | Regenerar tipos com novas colunas |
| `src/components/admin/PackagesManager.tsx` | Dois campos de valor + badges + save/load |
| `src/components/agenda/EventFormDialog.tsx` | Auto-fill + exibição + save dos dois valores |
| `src/pages/Agenda.tsx` | Interface e payload com novos campos |
| `src/components/contracts/EventContractDialog.tsx` | Novas variáveis no snapshot |
| `src/lib/template-resolver.ts` | 4 novas variáveis |
| `supabase/functions/_shared/template-resolver.ts` | 4 novas variáveis |

## Ordem de implementação (passo a passo)

1. Migration + types
2. PackagesManager (form + cards + save)
3. EventFormDialog + Agenda (auto-fill + save)
4. Template resolver + contrato (variáveis)

