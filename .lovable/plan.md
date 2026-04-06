

## Evolução dos Pacotes — Tabela de Preços por Faixa de Convidados e Tipo de Dia

### Objetivo
Cada pacote passará a ter uma **grade de preços** configurável por:
- **Faixa de convidados** (ex: 50, 60, 70, 80, 90, 100 — personalizável por buffet)
- **Tipo de dia** (ex: Seg-Qui, Sexta, Sábado, Domingo, Véspera de Feriado, Feriado — personalizável por buffet)

Quando o usuário preencher um evento no `EventFormDialog`, ao selecionar pacote + quantidade de convidados + data, o sistema **auto-calcula o valor** correto.

---

### 1. Nova tabela: `package_price_tiers`

```text
package_price_tiers
├── id (uuid, PK)
├── package_id (uuid, FK → company_packages.id, ON DELETE CASCADE)
├── company_id (uuid, FK → companies.id)
├── guest_count (integer)         -- ex: 50, 60, 70...
├── day_type (text)               -- ex: "seg_qui", "sexta", "sabado", "domingo", "vespera_feriado", "feriado"
├── price (numeric)               -- valor do pacote para essa combinação
├── created_at (timestamptz)
└── UNIQUE(package_id, guest_count, day_type)
```

RLS: mesma política de `company_packages` (por `company_id`).

### 2. Configuração dos tipos de dia (por empresa)

Armazenar no `companies.settings` um campo `day_type_config` com os tipos de dia que o buffet usa. Default:

```json
[
  { "key": "seg_qui", "label": "Seg a Qui" },
  { "key": "sexta", "label": "Sexta" },
  { "key": "sab_dom", "label": "Sáb e Dom" },
  { "key": "vespera_feriado", "label": "Véspera de Feriado" },
  { "key": "feriado", "label": "Feriado" }
]
```

Cada buffet pode customizar (ex: separar Sábado de Domingo, ou unir Sexta com Sáb/Dom).

### 3. Configuração das faixas de convidados (por empresa)

No `companies.settings`, campo `guest_tiers`:
```json
[50, 60, 70, 80, 90, 100]
```
Cada buffet configura suas faixas. Default: `[50, 60, 70, 80, 90, 100]`.

### 4. UI no PackagesManager — Editor de Grade de Preços

Ao editar/criar um pacote, além dos campos atuais (nome, descrição, preço separado criança/adulto), aparece uma **tabela/grid**:

```text
             | Seg-Qui  | Sexta   | Sáb/Dom | Véspera | Feriado
  50 pessoas | R$ ___   | R$ ___  | R$ ___  | R$ ___  | R$ ___
  60 pessoas | R$ ___   | R$ ___  | R$ ___  | R$ ___  | R$ ___
  70 pessoas | R$ ___   | R$ ___  | R$ ___  | R$ ___  | R$ ___
  ...
```

- Inputs de moeda em cada célula
- Salva em batch no `package_price_tiers`
- Os campos antigos de `valor_pessoa_adicional` continuam para extra-guest pricing

### 5. Auto-cálculo no EventFormDialog

Quando o usuário selecionar:
1. **Pacote** → carrega os tiers desse pacote
2. **Quantidade de convidados** → encontra a faixa mais próxima (igual ou superior)
3. **Data do evento** → detecta o tipo de dia:
   - Dia da semana (1-4 = seg-qui, 5 = sexta, 6 = sábado, 0 = domingo)
   - Feriado nacional brasileiro (lista estática + feriados fixos)
   - Véspera de feriado (dia anterior a feriado)
4. **Auto-preenche `total_value`** com o preço correspondente da grade
5. Exibe um badge informativo: "📅 Sábado · 70 pessoas · R$ 8.500,00"

Se não houver tier cadastrado para a combinação, o campo fica manual (comportamento atual).

### 6. Detecção de feriados nacionais

Criar helper `src/lib/brazilian-holidays.ts`:
- Lista de feriados fixos (Ano Novo, Tiradentes, Trabalho, Independência, Aparecida, Finados, Proclamação, Natal)
- Cálculo de Páscoa/Carnaval/Corpus Christi (móveis)
- Função `getDayType(date: Date): string` retorna o key do tipo de dia

### Arquivos impactados

| Arquivo | Ação |
|---|---|
| Nova migration | Criar tabela `package_price_tiers` com RLS |
| `src/components/admin/PackagesManager.tsx` | Adicionar grid de preços por faixa/dia |
| `src/components/agenda/EventFormDialog.tsx` | Auto-preencher valor com base em pacote+convidados+data |
| `src/lib/brazilian-holidays.ts` | Novo — helper de feriados e tipo de dia |
| `src/integrations/supabase/types.ts` | Regenerado com nova tabela |

### O que NÃO muda
- Campos existentes de `valor_pessoa_adicional` (criança/adulto) continuam funcionando para cobrar excedente
- Pacotes sem grade de preços cadastrada continuam no fluxo manual atual
- Nenhuma quebra para buffets que não configuram a grade

