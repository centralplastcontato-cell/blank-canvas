

## Plan: Optional per-adult/per-child pricing mode for events

### Problem
Some buffets charge per person (e.g., R$ 90/adult + R$ 65/child) rather than a fixed package price. Currently the system only supports a fixed "Valor do pacote". We need an **optional** toggle so buffets can switch to per-person pricing with separate adult and child quantities and prices.

### How it works
When the user selects a package that has `preco_separado = true` (already exists in `company_packages`), or manually toggles "Preço por pessoa", new fields appear:
- **Qtd Adultos** and **Qtd Crianças** (number inputs)
- **Valor por Adulto** and **Valor por Criança** (auto-filled from package, editable)
- The **Valor do pacote** field becomes read-only and auto-calculates: `(qtdAdultos × valorAdulto) + (qtdCriancas × valorCrianca)`

If the toggle is off (default), the form works exactly as today.

### Changes

**1. Add fields to `EventFormData` interface** (`EventFormDialog.tsx`)
- `pricing_mode?: 'fixed' | 'per_person'`
- `adult_count?: number | null`
- `child_count?: number | null`
- `price_per_adult?: number | null`
- `price_per_child?: number | null`

These are stored inside `payment_details` JSON (no DB migration needed).

**2. Update EventFormDialog UI** (Section "Informações da Festa")
- When a `preco_separado` package is selected, auto-enable per-person mode
- Add a small Switch "Preço por pessoa" below the package selector
- When enabled, show a sub-section with 4 fields in a 2×2 grid: Qtd Adultos, Valor/Adulto, Qtd Crianças, Valor/Criança
- Auto-calculate `total_value` = `(adult_count × price_per_adult) + (child_count × price_per_child)`
- The "Valor do pacote" input becomes disabled/readonly showing the calculated value
- `guest_count` auto-syncs to `adult_count + child_count`

**3. Auto-fill from package data**
- When selecting a package with `preco_separado`, auto-fill `price_per_adult` from `valor_pessoa_adicional_adulto` and `price_per_child` from `valor_pessoa_adicional_crianca`

**4. Persist in `payment_details` JSON**
- On save, include `pricing_mode`, `adult_count`, `child_count`, `price_per_adult`, `price_per_child` in the `payment_details` object
- On load (edit), restore these fields from `payment_details`

**5. Template variables** (`template-resolver.ts`)
- Add `{{qtd_adultos}}`, `{{qtd_criancas}}`, `{{valor_por_adulto}}`, `{{valor_por_crianca}}` for contracts

### What stays the same
- Buffets that don't use this feature see zero changes — the toggle defaults to off
- The existing fixed-price flow remains untouched
- No database migration required (data stored in existing JSON column)

