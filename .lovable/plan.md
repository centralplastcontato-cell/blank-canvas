

## Plan: Auto-generate "valor por extenso" for all monetary values in contracts

### Problem
Currently, contracts show monetary values only in numeric format (e.g., `R$ 6.764,00`). The user wants all monetary values to also display the written-out form in Portuguese (e.g., "seis mil setecentos e sessenta e quatro reais").

### Approach
Create a `numberToWordsPortuguese(value: number): string` utility function and use it to automatically populate `{{valor_total_extenso}}` and add new extenso variables for other monetary fields.

### Changes

**1. New utility: `src/lib/number-to-words-pt.ts`**
- Pure function that converts any number to Brazilian Portuguese words
- Handles units, tens, hundreds, thousands, millions
- Appends "reais" and "centavos" correctly
- Example: `6764.00` → `"seis mil setecentos e sessenta e quatro reais"`
- Example: `270.00` → `"duzentos e setenta reais"`
- Example: `1500.50` → `"um mil e quinhentos reais e cinquenta centavos"`

**2. Update `src/lib/template-resolver.ts`**
- Import the converter function
- Auto-compute `valor_total_extenso` from `ctx.event?.value` when not manually set
- Add new variables: `{{valor_sinal_extenso}}`, `{{valor_restante_extenso}}`, `{{valor_convidado_adicional_extenso}}`
- Each resolves the numeric value and converts to words automatically

**3. Update `supabase/functions/_shared/template-resolver.ts`**
- Mirror the same changes for edge functions (inline the converter or import)

**4. Update contract context builders** (`ContractGenerator.tsx` and `EventContractDialog.tsx`)
- Auto-fill `valor_total_extenso` from `total_value` when the field is empty
- No manual entry needed — the system generates it from the numeric value

### Result
All `R$` values in contracts will automatically have a corresponding `_extenso` variable available. Template authors can use `{{valor_total_extenso}}`, `{{valor_sinal_extenso}}`, etc. alongside the numeric versions.

