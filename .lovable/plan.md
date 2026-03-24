

## Problema

O bot do WhatsApp exibe nomes internos de unidade ("Vendas 1", "Vendas 2") nas mensagens enviadas ao cliente. Exemplo: "📍 Unidade: Vendas 1" e "Conheça a unidade Vendas 1". O cliente deveria ver apenas o nome da empresa ("Castelo da Diversão").

## Solução

Substituir a variável `{unidade}` pelo nome da empresa (`companies.name`) em todas as mensagens voltadas ao cliente, em 3 arquivos:

### 1. `supabase/functions/wapi-webhook/index.ts`

**Função `sendQualificationMaterials`** (linha ~2766):
- Expandir o tipo do parâmetro `instance` para incluir `company_id: string`
- Buscar `companies.name` no início da função
- Usar o nome da empresa no lugar de `unit` em todas as substituições de `{unidade}` (linhas ~2949, 2975, 2989, 3025)
- Alterar o fallback do caption de vídeo de `"Conheça a unidade ${unit}"` para `"Conheça o ${companyName}"` (linha ~2974)

**Função `sendQualificationMaterialsThenQuestion`** (linha ~3061):
- Mesma expansão do tipo `instance` para incluir `company_id`

**Default do `pdfIntro`** (linha ~2811):
- Alterar de `"na unidade {unidade}"` para `"no {empresa}"`

### 2. `src/components/landing/LeadChatbot.tsx`

- Na mensagem padrão (linha ~392), trocar `📍 Unidade: ${unit}` por `📍 Local: ${displayName}`
- Na mensagem de redirect (linha ~401), mesma alteração
- Na função `buildWhatsAppMessage` (linha ~559), trocar `📍 Unidade: ${leadData.unit}` por `📍 Local: ${displayName}`

### 3. `src/components/whatsapp/settings/LPBotSection.tsx`

- Atualizar o template padrão `whatsapp_welcome_template` (linha ~49): trocar `📍 Unidade: {unidade}` por `📍 Local: {empresa}`
- Atualizar o placeholder (linha ~201) de forma correspondente

### 4. `supabase/functions/follow-up-check/index.ts`

- Mesma alteração no default do `pdfIntro` (linha ~2348): `"na unidade {unidade}"` → `"no {empresa}"`
- Alterar fallback do video caption (linha ~2485): `"Conheça a unidade ${unit}"` → buscar nome da empresa e usar

### 5. `supabase/functions/rescue-orphan-leads/index.ts`

- Trocar `📍 Unidade: ${TARGET_UNIT}` por `📍 Local: Castelo da Diversão` (linha ~76)

### Nota importante

O `unit` continua sendo usado internamente para filtrar `sales_materials` no banco (queries com `.eq('unit', unit)`). A mudança é apenas nas mensagens visíveis ao cliente.

