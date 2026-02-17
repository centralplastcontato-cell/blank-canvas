

## Corrigir link de Manutencao no WhatsApp

### Problema atual
1. A URL compartilhada mostra o dominio feio do Supabase (`rsezgnkfhodltrsewlhz.supabase.co/functions/v1/og-preview?domain=...`)
2. A Edge Function `og-preview` nunca foi deployada com sucesso (0 logs, retorna 404)
3. O WhatsApp resolve o OG do dominio `castelodadiversao.online` via SCD, que esta configurado com metadados genericos da "Celebrei"

### Solucao: Link limpo + deploy da og-preview

**Abordagem em duas partes:**

#### Parte 1 - URL limpa (imediato)
Mudar o botao de compartilhar para gerar a URL direta do buffet:
```
https://www.castelodadiversao.online/manutencao/{id}
```
em vez de:
```
https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/og-preview?domain=...
```

Isso resolve o problema da URL feia. Para gerar a URL correta de cada empresa, o sistema ja tem acesso ao `custom_domain` da empresa no contexto. Se o buffet tem dominio customizado, usa ele; se nao, usa o dominio do app.

**Arquivo: `src/components/agenda/MaintenanceManager.tsx`**
- Alterar a logica do botao Share2 para construir a URL usando `custom_domain` da empresa (disponivel via CompanyContext) ou fallback para `window.location.origin`

#### Parte 2 - Deploy da og-preview (meta tags corretas)
Deployar efetivamente a funcao `og-preview`. O codigo ja suporta `/manutencao/:id` e retorna "Checklist de Manutencao | Castelo da Diversao" com o logo correto.

Porem, para que o WhatsApp exiba as meta tags dinamicas, o link precisa passar pela og-preview. Como estamos mudando para URL limpa na Parte 1, o preview do WhatsApp dependerá de como o SCD esta configurado para o dominio.

#### Parte 3 - Fallback pragmatico
Como o SCD do dominio `castelodadiversao.online` ja tem metadados configurados (mesmo que genericos), a URL limpa pelo menos mostrara:
- Dominio bonito: `castelodadiversao.online`
- Preview do SCD (que pode ser atualizado para "Castelo da Diversao" via API do SCD)

### Resultado esperado
- URL limpa e profissional no WhatsApp
- Preview mostrando o branding do buffet (nao "Celebrei")
- O link redireciona corretamente para o formulario de manutencao

### Mudancas tecnicas
1. `src/components/agenda/MaintenanceManager.tsx` - Mudar URL de compartilhamento para usar `custom_domain`
2. Deploy da Edge Function `og-preview`
3. Verificar/atualizar metadados SCD do dominio `castelodadiversao.online`

