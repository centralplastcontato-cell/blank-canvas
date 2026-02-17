
## Corrigir link de compartilhamento da Manutencao

### Problema
O botao de compartilhar no MaintenanceManager gera o link direto para o SPA (`window.location.origin/manutencao/:id`). O crawler do WhatsApp nao consegue ler meta tags dinamicas de um SPA React, entao exibe a miniatura generica do Hub.

### Como ja funciona para multiplos buffets
A Edge Function `og-preview` ja resolve dinamicamente o branding correto:
1. Recebe o ID do registro de manutencao
2. Busca o `company_id` na tabela `maintenance_entries`
3. Busca `name` e `logo_url` na tabela `companies`
4. Retorna HTML com meta tags OG do buffet correto

Isso funciona automaticamente para qualquer numero de empresas -- cada link resolve para o buffet dono daquele registro.

### Mudanca necessaria

**Arquivo: `src/components/agenda/MaintenanceManager.tsx`**

Alterar o botao Share2 (linha ~199) para gerar a URL via `og-preview` em vez do link direto:

**De:**
```
window.location.origin/manutencao/{id}
```

**Para:**
```
{SUPABASE_URL}/functions/v1/og-preview?domain={window.location.host}&path=/manutencao/{id}
```

Usar `supabase` client para extrair a URL base do Supabase (mesmo padrao dos outros formularios).

**Arquivo: `supabase/functions/og-preview/index.ts`**

Deploy da funcao (o codigo ja esta pronto com suporte a `/manutencao/:recordId`).

### Resultado
- WhatsApp exibira "Checklist de Manutencao | [Nome do Buffet]" com o logo correto
- Funciona automaticamente para qualquer empresa cadastrada
- Mesmo padrao usado nos demais formularios (avaliacao, pre-festa, contrato, etc.)
