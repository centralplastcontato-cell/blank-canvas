

# Conectar dominio aventurakids.online ao projeto

## O que precisa ser feito

### 1. Registrar o dominio no codigo de roteamento

**Arquivo: `src/hooks/useDomainDetection.ts`**
- Adicionar `"aventurakids.online": "aventurakids.online"` ao objeto `KNOWN_BUFFET_DOMAINS`

Isso garante que quando alguem acessar `aventurakids.online`, o sistema carregue a `DynamicLandingPage` com os dados da empresa Aventura Kids (puxados do Supabase via `custom_domain` ou `domain_canonical`).

### 2. Configurar o dominio customizado no Lovable

Apos a alteracao no codigo, voce precisara:

1. Ir em **Project Settings > Domains** no Lovable
2. Adicionar `aventurakids.online` e `www.aventurakids.online`
3. Configurar os registros DNS no provedor do dominio:
   - **A Record** `@` apontando para `185.158.133.1`
   - **A Record** `www` apontando para `185.158.133.1`
   - **TXT Record** `_lovable` com o valor fornecido pelo Lovable
4. **Importante**: Se estiver usando Cloudflare, desativar o Proxy (deixar "DNS only" / nuvem cinza) para que o SSL seja emitido corretamente

### 3. Atualizar a empresa no Supabase

No Hub Empresas, editar a Aventura Kids e preencher:
- **custom_domain**: `aventurakids.online`
- **domain_canonical**: `aventurakids.online`

Isso conecta o dominio aos dados da empresa para que a LP dinamica carregue o conteudo correto.

## Resumo tecnico

Apenas 1 linha de codigo precisa ser adicionada. O restante e configuracao de DNS e dados no Supabase.

