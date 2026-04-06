

## PWA Multi-Tenant com Manifest Dinâmico

### Contexto

Cada empresa (buffet) tem seu próprio domínio, logo, nome e cores no banco de dados. O PWA precisa gerar um `manifest.json` dinâmico por domínio para que, ao instalar o app no celular, cada empresa tenha seu ícone, nome e tema corretos.

### Abordagem

Como PWAs são registrados **por origem (domínio)**, cada empresa terá uma instalação independente. A solução usa uma **Edge Function** para gerar o manifest dinamicamente e um **Service Worker mínimo** (sem cache agressivo) apenas para habilitar a instalação.

### Arquitetura

```text
Usuário acessa castelodadiversao.online
  → index.html tem <link rel="manifest" href="/api/manifest">
  → Vite proxy (dev) ou Supabase Edge Function (prod) resolve o domínio
  → Consulta tabela companies (nome, logo, cores)
  → Retorna manifest.json personalizado
  → Ícone do app = logo da empresa
  → Nome do app = nome da empresa
  → Cores = brand_color da empresa
```

### Plano de Implementação

**1. Criar Edge Function `pwa-manifest`**
- Recebe o header `Host` ou `x-forwarded-host`
- Consulta `companies` por `domain_canonical`
- Retorna JSON com `name`, `short_name`, `icons` (usando `logo_url`), `theme_color`, `background_color`, `display: "standalone"`, `start_url: "/"`
- Fallback genérico "Celebrei" para domínios Hub/desconhecidos

**2. Atualizar `index.html`**
- Trocar o `<link rel="icon">` estático por lógica dinâmica
- Adicionar `<link rel="manifest">` apontando para a Edge Function:
  ```html
  <link rel="manifest" href="https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/pwa-manifest" crossorigin="use-credentials" />
  ```
- Manter o script de OG tags existente (não alterar)

**3. Registrar Service Worker mínimo (sem cache)**
- Criar `public/sw.js` com apenas o evento `fetch` passthrough (sem interceptar)
- Registrar condicionalmente em `src/main.tsx`:
  - Bloquear em iframes (preview do Lovable)
  - Bloquear em domínios `lovable.app` / `lovableproject.com`
  - Registrar apenas em produção (domínios reais)

**4. Configurar `supabase/config.toml`**
- Adicionar `[functions.pwa-manifest]` com `verify_jwt = false`

### Detalhes Técnicos da Edge Function

```typescript
// supabase/functions/pwa-manifest/index.ts
// 1. Extrai hostname do request (Host header)
// 2. Canonicaliza (remove www, lowercase)
// 3. Consulta companies WHERE domain_canonical = host
// 4. Retorna manifest JSON com:
//    - name / short_name do company.name
//    - icons: [{ src: company.logo_url, sizes: "512x512", type: "image/png" }]
//    - theme_color: company.settings.partner_appearance.brand_color || "#7c3aed"
//    - background_color: "#ffffff"
//    - display: "standalone"
//    - start_url: "/"
//    - scope: "/"
```

### Service Worker (`public/sw.js`)

Arquivo mínimo que não cacheia nada, apenas habilita a instalabilidade:
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
```

### Guard de Registro (em `src/main.tsx`)

```typescript
const isInIframe = (() => { try { return self !== top; } catch { return true; } })();
const isPreview = location.hostname.includes('lovable');
if (!isInIframe && !isPreview && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### Resultado Esperado

- **castelodadiversao.online**: Ícone do Castelo, nome "Castelo da Diversão", cor rosa
- **buffetplanetadivertido.online**: Ícone do Planeta Divertido, nome "Planeta Divertido", cor padrão
- **aventurakids.online**: Ícone Aventura Kids
- **hubcelebrei.com.br**: Ícone Celebrei, cor roxa

Cada instalação é 100% isolada por domínio, sem risco de misturar dados ou ícones entre empresas.

