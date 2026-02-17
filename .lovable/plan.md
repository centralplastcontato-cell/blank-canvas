

## Corrigir preview de Manutenção no WhatsApp

### Problema identificado
A Edge Function `og-preview` **não está deployada**. Ao chamar a URL, o Supabase retorna `404 NOT_FOUND`. Por isso, quando o WhatsApp tenta fazer o crawl do link, não recebe nenhuma meta tag OG e exibe o fallback genérico do domínio ("Celebrei | A melhor plataforma para buffets infantis").

### Causa raiz
A função foi editada no código-fonte mas nunca foi efetivamente deployada no Supabase.

### Solução
Apenas **deployar** a função `og-preview`. O código já está completo e correto com suporte a `/manutencao/:recordId`.

### Validação
Após o deploy, testar a URL:
```
https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/og-preview?domain=www.castelodadiversao.online&path=/manutencao/{id}
```
O resultado esperado é HTML com:
- Título: "Checklist de Manutenção | Castelo da Diversão"
- Imagem: logo do Castelo da Diversão
- Redirect para o link direto da manutenção

### Mudanças
- Nenhuma alteração de código necessária
- Apenas deploy da Edge Function `og-preview`
