
## Corrigir links de Instagram e WhatsApp no footer da Landing Page Dinamica

### Problema
O footer da LP dinamica mostra os botoes de Instagram e WhatsApp, mas ambos apontam para `href="#"` (link vazio). O Instagram do Planeta Divertido (`@buffetplanetadivertido`) existe no banco de dados na tabela `company_onboarding`, mas nunca e buscado nem passado ao componente do footer.

### Solucao

**1. Buscar o Instagram do onboarding** (`DynamicLandingPage.tsx`)
- Adicionar `instagram` ao `select` da query de `company_onboarding` (linha 69)
- Armazenar o valor no state `data` como `company_instagram`

**2. Passar os dados ao footer** (`DynamicLandingPage.tsx`)
- Adicionar props `instagramHandle` e `whatsappNumber` ao componente `<DLPFooter>`

**3. Usar os dados no footer** (`DLPFooter.tsx`)
- Receber `instagramHandle` e `whatsappNumber` como props
- Instagram: converter `@buffetplanetadivertido` para `https://instagram.com/buffetplanetadivertido`
- WhatsApp: converter o numero para `https://wa.me/55...`

### Detalhes tecnicos

**`src/pages/DynamicLandingPage.tsx`**
- Alterar select: `'whatsapp_numbers, multiple_units'` para `'whatsapp_numbers, multiple_units, instagram'`
- Adicionar `company_instagram: onb?.instagram || null` ao objeto `data`
- Atualizar interface `LPData` com `company_instagram: string | null`
- Passar ao footer: `<DLPFooter ... instagramHandle={data.company_instagram} whatsappNumber={data.company_whatsapp} />`

**`src/components/dynamic-lp/DLPFooter.tsx`**
- Adicionar props `instagramHandle?: string | null` e `whatsappNumber?: string | null`
- Instagram `href`: gerar URL a partir do handle (removendo `@` se presente)
- WhatsApp `href`: usar `https://wa.me/{numero}` (numero ja vem limpo do onboarding)
- Adicionar `target="_blank"` e `rel="noopener noreferrer"` nos dois links
