
# Configurar domínio `buffetplanetadivertido.online` para o Planeta Divertido

## Contexto

O domínio escolhido é `buffetplanetadivertido.online` — diferente do site atual do cliente (`buffetplanetadivertido.com.br`). O banco ainda está com `.com.br` mapeado (da tentativa anterior). Precisamos corrigir para `.online` e garantir que as miniaturas do WhatsApp mostrem o logo e o nome correto do Planeta Divertido, e não do Hub.

## Problema das Miniaturas (por que acontece)

O WhatsApp não executa JavaScript. Quando o bot lê o link, ele recebe o `index.html` estático com os og: tags do Hub ainda no topo do arquivo. O script de override que existe no `index.html` roda depois que o HTML foi parseado — para usuários normais funciona, mas o bot já foi embora nesse ponto.

O script atual usa `document.querySelector()` para sobrescrever tags existentes, mas isso ocorre depois do parsing. A solução é usar `document.write()` de forma síncrona durante o parsing, antes das tags estáticas serem declaradas — assim o bot vê o conteúdo correto diretamente no HTML.

## O Que Será Feito

### 1. Banco de Dados — Corrigir domain_canonical para `.online`

O banco está com `buffetplanetadivertido.com.br`. Será criada uma nova migration para corrigir para `buffetplanetadivertido.online`:

```sql
UPDATE companies
SET
  custom_domain = 'buffetplanetadivertido.online',
  domain_canonical = 'buffetplanetadivertido.online',
  updated_at = now()
WHERE id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11';
```

### 2. Banco de Dados — Criar registro de Landing Page

Inserir um registro inicial em `company_landing_pages` para o Planeta Divertido com conteúdo template (não publicado), pronto para ser editado e publicado:

- Hero com título genérico e CTA
- Tema com cores neutras padrão
- Seções de galeria, depoimentos, vídeo e oferta habilitadas e vazias
- `is_published = false` (só vai ao ar quando aprovado)

### 3. `useDomainDetection.ts` — Corrigir domínio mapeado

Trocar `.com.br` por `.online` no mapeamento de domínios conhecidos:

```typescript
export const KNOWN_BUFFET_DOMAINS: Record<string, string> = {
  "castelodadiversao.com.br": "castelodadiversao.com.br",
  "buffetplanetadivertido.online": "buffetplanetadivertido.online",  // corrigido
};
```

### 4. `index.html` — Refatorar script de OG para funcionar com bots do WhatsApp

Esta é a correção principal para as miniaturas. A abordagem muda de "sobrescrever depois" para "injetar antes":

**Estrutura atual (não funciona para bots):**
```html
<!-- Tags estáticas do Hub declaradas aqui -->
<meta property="og:title" content="Celebrei | ..." />
...
<!-- Script que tenta sobrescrever DEPOIS -->
<script>document.querySelector('meta[...]').setAttribute('content', '...')</script>
```

**Nova estrutura (funciona para bots):**
```html
<!-- Script síncrono injeta as tags ANTES com document.write() -->
<script>
  (function() {
    var h = window.location.hostname;
    var brand = {};
    if (h.indexOf('castelodadiversao') !== -1) {
      brand = { title: 'Castelo da Diversão | Buffet Infantil', ... };
    } else if (h.indexOf('buffetplanetadivertido') !== -1) {
      brand = { title: 'Buffet Planeta Divertido | Festa Infantil', ... };
    } else {
      brand = { title: 'Celebrei | A melhor plataforma para buffets infantis', ... };
    }
    document.write('<meta property="og:title" content="' + brand.title + '" />');
    // ... demais tags
  })();
</script>
<!-- Sem tags estáticas de OG após o script -->
```

Isso funciona porque o `document.write()` durante o parsing insere HTML diretamente no fluxo, antes que o bot termine de ler o documento. O bot vê as tags corretas como se fossem estáticas.

O logo do Planeta Divertido a ser usado:
`https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/company-logos/planeta-divertido-1771620883350.png`

### 5. `supabase/functions/og-preview/index.ts` — Adicionar Planeta Divertido ao `STATIC_BRANDS`

Para quando o proxy SCD estiver configurado para o domínio, a Edge Function também retorna os metadados corretos:

```typescript
const STATIC_BRANDS = {
  hubcelebrei: { ... },
  castelodadiversao: { ... },
  buffetplanetadivertido: {
    title: "Buffet Planeta Divertido | Festa Infantil",
    description: "Venha celebrar no Planeta Divertido! O melhor buffet infantil para a festa do seu filho.",
    image: "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/company-logos/planeta-divertido-1771620883350.png",
    url: "https://buffetplanetadivertido.online",
  },
};
```

## Fluxo Após a Implementação

```text
Usuário compra buffetplanetadivertido.online
         ↓
Aponta DNS: A record para 185.158.133.1 + TXT _lovable
         ↓
Conecta domínio no painel Lovable (Settings > Domains)
         ↓
Domínio ativo → serve o projeto Celebrei
         ↓
Bot do WhatsApp acessa o link compartilhado
         ↓
script síncrono no index.html detecta "buffetplanetadivertido"
         ↓
document.write() injeta og: tags do Planeta Divertido
         ↓
Miniatura correta no WhatsApp ✅
```

## Arquivos a Modificar

- **Migration SQL nova** → corrigir `domain_canonical` + criar `company_landing_pages`
- **`src/hooks/useDomainDetection.ts`** → trocar `.com.br` por `.online`
- **`index.html`** → refatorar script de OG para `document.write()` com detecção de Planeta Divertido
- **`supabase/functions/og-preview/index.ts`** → adicionar `buffetplanetadivertido` no `STATIC_BRANDS`

## O Que NÃO Muda

- O site atual do cliente em `buffetplanetadivertido.com.br` — não é afetado
- O Castelo da Diversão e o Hub — continuam funcionando normalmente
- A estrutura da `DynamicLandingPage` e do chatbot de leads

## Passos Após a Implementação (manuais, fora do código)

1. Comprar o domínio `buffetplanetadivertido.online`
2. Apontar os registros DNS para `185.158.133.1` (A record para `@` e `www`)
3. Adicionar o TXT `_lovable` fornecido pelo Lovable
4. Conectar o domínio no painel Lovable em Settings > Domains
5. Publicar a Landing Page quando o conteúdo estiver pronto
