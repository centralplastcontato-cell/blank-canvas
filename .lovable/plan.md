

# Resolucao robusta de tenant por dominio (www vs sem www)

## Problema
O campo `custom_domain` da tabela `companies` armazena `www.castelodadiversao.online`, mas quando o usuario acessa `castelodadiversao.online` (sem www), a resolucao falha porque a comparacao e exata. Isso causa mistura de OG/branding entre Hub e buffet.

## Estrategia (3 passos incrementais, 1 unica implementacao)

Reutilizar o campo `custom_domain` existente como `domain_primary` (evitando renomear). Adicionar apenas `domain_canonical` como coluna computada/armazenada. Nao adicionar `domain_aliases` como coluna separada -- a logica de aliases sera feita via normalizacao no codigo e no RPC (mais simples, menos migracao).

## Alteracoes

### Passo 1: Migracao do banco (1 unica migracao)

Adicionar coluna `domain_canonical` a tabela `companies`:

```text
ALTER TABLE companies ADD COLUMN domain_canonical text;

-- Preencher para empresas existentes: remover www. e lowercase
UPDATE companies 
SET domain_canonical = lower(regexp_replace(custom_domain, '^www\.', ''))
WHERE custom_domain IS NOT NULL;

-- Atualizar a RPC get_landing_page_by_domain para comparar com canonical
CREATE OR REPLACE FUNCTION get_landing_page_by_domain(_domain text)
RETURNS TABLE(...) AS $$
  -- Normalizar input: lowercase + remover www.
  WITH normalized AS (
    SELECT lower(regexp_replace(_domain, '^www\.', '')) AS canonical
  )
  SELECT ... FROM companies c JOIN company_landing_pages lp ...
  WHERE c.domain_canonical = (SELECT canonical FROM normalized)
    AND c.is_active = true AND lp.is_published = true
  LIMIT 1;
$$
```

Tambem criar uma RPC nova `get_company_by_domain` para resolver tenant sem precisar de landing page:

```text
CREATE OR REPLACE FUNCTION get_company_by_domain(_domain text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, custom_domain text, settings jsonb)
AS $$
  SELECT id, name, slug, logo_url, custom_domain, settings
  FROM companies
  WHERE domain_canonical = lower(regexp_replace(_domain, '^www\.', ''))
    AND is_active = true
  LIMIT 1;
$$
```

### Passo 2: Frontend -- normalizacao e resolucao de tenant

**`src/hooks/useDomainDetection.ts`** -- Adicionar funcao `normalizeHostname`:
- Remove `www.`, converte para lowercase, remove porta
- Exportar como `getCanonicalHost()`
- Atualizar `isHubDomain()` para usar hostname normalizado

**`src/pages/RootPage.tsx`** -- Usar hostname normalizado:
- Em vez de comparar com `www.castelodadiversao.online` E `castelodadiversao.online` separadamente, normalizar e comparar com `castelodadiversao.online` apenas
- Passar hostname normalizado para `DynamicLandingPage`

**`src/pages/DynamicLandingPage.tsx`** -- Ja funciona, pois o RPC normaliza no banco

### Passo 3: OG dinamico por empresa

**`index.html`** -- Atualizar script inline:
- O script ja usa `indexOf('castelodadiversao')` que funciona para ambos www e sem www
- Adicionar suporte generico: consultar um mapa de dominios ou manter o pattern atual

**`src/pages/DynamicLandingPage.tsx`** -- Ja tem `<Helmet>` com dados dinamicos. Enriquecer com:
- `og:description` usando `data.hero.subtitle`
- `og:url` usando `domain_primary` da empresa
- `og:image` usando `data.company_logo`

### Passo 4: Redirect opcional para dominio primario

**`src/hooks/useDomainDetection.ts`** -- Adicionar funcao `redirectToPrimaryDomain`:
- Recebe `domain_primary` da empresa resolvida
- Se `window.location.hostname` != `domain_primary`, faz `window.location.replace()`
- Controlado por flag em `company.settings.force_primary_domain` (default: false)
- Chamado no RootPage apos resolver empresa

### Passo 5: Debug logging (dev only)

No `RootPage.tsx`, adicionar log condicional:
```text
if (import.meta.env.DEV) {
  console.log('[TenantResolver]', { hostname, canonicalHost, company, redirect });
}
```

## Arquivos alterados

1. **Migracao SQL** -- 1 arquivo de migracao com: coluna `domain_canonical`, UPDATE existentes, RPCs atualizadas
2. **`src/hooks/useDomainDetection.ts`** -- normalizeHostname, getCanonicalHost, redirectToPrimaryDomain
3. **`src/pages/RootPage.tsx`** -- usar canonical host, chamar redirect, logs dev
4. **`src/pages/DynamicLandingPage.tsx`** -- enriquecer Helmet com mais meta tags OG
5. **`supabase/functions/og-preview/index.ts`** -- atualizar para usar canonical na busca

## O que NAO sera alterado (economia de creditos)
- Tabela `companies` NAO sera renomeada nem tera campo `domain_aliases` separado (aliases sao resolvidos via normalizacao)
- Campo `custom_domain` continua sendo o `domain_primary` (sem renomear)
- Paginas internas (Auth, Dashboard, etc.) ja tem Helmet configurado -- nao serao tocadas
- `index.html` -- script inline ja cobre o caso do Castelo, nao precisa mudar

## Resultado esperado
- `www.castelodadiversao.online` -> resolve Castelo, OG do Castelo
- `castelodadiversao.online` -> resolve Castelo (via canonical), opcionalmente redireciona para www
- Qualquer futuro buffet com dominio proprio -> funciona automaticamente (basta preencher `custom_domain`)
- Dominio desconhecido -> Hub padrao, OG do Hub

