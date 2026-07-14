# Saída da Lovable — plano e checklist

**Regra de ouro:** a Lovable continua **paga e ligada** até o último item estar concluído.
Enquanto o DNS puder voltar para `185.158.133.1`, o rollback leva minutos.

## O que muda e o que NÃO muda

**NÃO muda (zero risco de perda de dados):** o backend inteiro é Supabase
(projeto `rsezgnkfhodltrsewlhz`, que está na conta do Rodrigo). Banco, auth,
storage, as 40 edge functions e os webhooks de WhatsApp continuam exatamente
onde estão. Trocar quem serve o front-end não encosta em nada disso.

**Muda:** apenas quem entrega os arquivos estáticos do front. Hoje é a Lovable,
passa a ser a Vercel.

## As 3 amarras reais com a Lovable

Descobertas na auditoria. As duas primeiras **quebram em produção** se a
assinatura for cancelada antes de resolvê-las.

### 1. Assets do Aventura Kids hospedados na Lovable — QUEBRA A LP

A LP do Aventura Kids serve, **hoje, em produção**, a imagem de fundo e o vídeo
a partir de `naked-screen-charm.lovable.app` (um deploy antigo deste mesmo repo).
Cancelar a Lovable derruba esse subdomínio e a LP perde o fundo e o vídeo.

Uma função (`migrate-aventura-images`) já migrou o logo e a galeria, mas deixou
3 campos para trás porque não mexe nas colunas JSONB `hero` e `video`:

| Campo | Arquivo | Situação |
|---|---|---|
| `hero.background_images[0]` | `fachada-aventura-kids.jpg` | já está no Storage — só falta repontar o banco |
| `video.videos[0].poster_url` | `fachada-aventura-kids.jpg` | idem |
| `video.videos[1].video_url` | `aventura-kids.mp4` | **falta subir o arquivo pro Storage** |

**Como resolver:**
1. Suba `public/videos/aventura-kids.mp4` (está no repo) no Supabase Storage:
   Dashboard → Storage → bucket `onboarding-uploads` → pasta
   `eb1776f0-142e-41db-9134-7d352d02c5bd/migrated/` → Upload.
2. Rode `01-varredura-lovable.sql` (só leitura) para confirmar que não há mais
   nada escondido no banco além desses 2 campos.
3. Rode `02-corrige-aventura-kids.sql` (tem backup, prévia e rollback).

As outras 4 LPs (Castelo, Mega Magic, Planeta Divertido, Espaço Carrossel)
foram verificadas e estão **limpas**.

### 2. Gateway de IA da Lovable — QUEBRA 2 FUNÇÕES

Duas edge functions chamam `https://ai.gateway.lovable.dev/v1/chat/completions`
usando o secret `LOVABLE_API_KEY`:

- `campaign-ai` (geração de mensagens de campanha)
- `monthly-review` (revisão mensal)

Cancelar a Lovable mata as duas **silenciosamente**.

**Como resolver:** o gateway é compatível com a API da OpenAI (mesmo formato
`/v1/chat/completions`), então a troca é pequena — mudar a URL, o secret e o
nome do modelo. O projeto **já tem `OPENAI_API_KEY`** configurado e em uso
(`dall-e-3`, `gpt-4o-mini`), então dá para apontar direto pra OpenAI sem abrir
conta nova. Alternativa: usar a API do Google Gemini direto, mantendo o mesmo
modelo (`gemini-3-flash-preview`).

### 3. Deploy das edge functions

Hoje quem faz o deploy das 40 functions no Supabase é a Lovable. Ao sair, isso
passa a ser feito por você via Supabase CLI (`supabase functions deploy`).
Não bloqueia a virada de DNS, mas **precisa estar funcionando antes de cancelar**
— senão você fica sem conseguir alterar o backend.

## Checklist da migração

### Fase 1 — Preparação (FEITO)
- [x] Auditoria completa do acoplamento com a Lovable
- [x] `vercel.json` com rewrite de SPA (sem isso, as 79 rotas dão 404)
- [x] `isPreviewDomain()` reconhece `*.vercel.app` (sem isso, o preview mostra NotFound)
- [x] `.env` fora do versionamento (só tinha URL + anon key, ambas públicas)
- [x] Build de produção validado

### Fase 2 — Vercel em paralelo (produção intocada)
- [ ] Importar o repo na Vercel — **sem variáveis de ambiente** (credenciais são hardcoded)
- [ ] Deploy da branch `migracao-vercel` → URL `*.vercel.app`
- [ ] Testar na URL de preview: login, agenda, WhatsApp, contratos, as 5 LPs
- [ ] Merge para a `main`

### Fase 3 — Cortar as amarras — CONCLUÍDA
- [x] `aventura-kids.mp4` no Supabase Storage (3.627.085 bytes, idêntico ao original)
- [x] `01-varredura-lovable.sql` rodada no banco inteiro. Resultado: 5 achados,
      sendo **3 falsos positivos** (dois contatos "Teste Lovable" e um payload de
      webhook com a palavra no texto — nenhum é URL, nenhum quebra).
- [x] `02-corrige-aventura-kids.sql` rodada. Os 3 campos (`hero.background_images[0]`,
      `video.videos[0].poster_url`, `video.videos[1].video_url`) agora apontam para
      o Supabase Storage. Verificado pela RPC pública: **0 menções a lovable**.
- [x] `campaign-ai` (v167→168) e `monthly-review` (v135→136) migradas para
      `api.openai.com` + `OPENAI_API_KEY` + `gpt-4o-mini`. Deployadas e ACTIVE.
- [x] Deploy de edge functions via Supabase CLI validado
      (`npx supabase functions deploy <nome> --use-api` — sem Docker).

**Estado atual: se a assinatura da Lovable for cancelada hoje, a ÚNICA coisa que
quebra é a hospedagem do front-end. Banco, WhatsApp, funções, imagens, vídeos e
as 5 landing pages já rodam 100% em infraestrutura própria.**

### Fase 4 — Virada de DNS (um domínio por vez)
- [x] TTL de todos os domínios em 300s (só `espacocarrossel.online` raiz ficou
      em 14400s — corrigir antes de virar esse)
- [x] **castelodadiversao.online — NO AR PELA VERCEL, verificado:**
      HTTPS + cert Let's Encrypt, rotas profundas (`/auth`, `/agenda`,
      `/atendimento`, `/contratos`) todas 200, apex→www 308, assets 200,
      servidor Vercel, zero menção a Lovable.
- [ ] Observar o Castelo por 24–48h
- [ ] Virar **buffetplanetadivertido**
- [ ] Virar **buffetmegamagic**
- [ ] Virar os demais (aventurakids, espacocarrossel, hubcelebrei)
- [ ] `celebrei.com.br` — **investigar antes**: está na Cloudflare apontando
      para `35.219.200.14` (Google Cloud), não na Lovable. O código o trata como
      domínio do Hub, mas o DNS discorda. Entender o que é antes de mexer.

#### Receita da virada (validada no Castelo)

Para cada domínio, na Hostinger:
1. `A` `@` : trocar `185.158.133.1` → **`216.150.1.1`**
2. `A` `www` : **apagar** (não pode coexistir com CNAME)
3. Criar `CNAME` `www` → o alvo que a Vercel mostrar (é **específico por
   projeto**, ex.: `a83df4bb1fc5d553.vercel-dns-016.com`). Não reutilizar de
   outro domínio sem conferir.
4. **NÃO tocar** nos TXT `_lovable` / `_lovable.www` — são o que mantém a Lovable
   capaz de reassumir no rollback. Só apagar na Fase 5.

⚠️ **ARMADILHA DO CERTIFICADO (aconteceu no Castelo, vai acontecer de novo):**
depois de trocar o DNS, a Vercel **não emite o certificado sozinha na hora**. Ela
guarda o estado "Invalid Configuration" do primeiro check (quando o DNS ainda
apontava pra Lovable) e só re-verifica em ciclos lentos. Enquanto isso, o HTTPS
fica **fora do ar** — a conexão TLS é derrubada, porque não há certificado.

**Vá IMEDIATAMENTE em Vercel → Domains e clique em "Refresh" nas duas linhas**
(apex e www). Isso força a verificação e dispara a emissão. Sem isso, o site
pode ficar ~20 min sem HTTPS.

Rollback (5 min, graças ao TTL 300): `A` `@` → `185.158.133.1`; apagar o CNAME
`www` e recriar como `A` `www` → `185.158.133.1`.

### Fase 5 — Adeus Lovable (só depois de tudo estável)
- [ ] Remover `lovable-tagger` do `package.json` e do `vite.config.ts`
- [ ] Limpar `README.md` e apagar `.lovable/`
- [ ] Remover `lovable.app` / `lovableproject.com` de `isPreviewDomain()` e `main.tsx`
- [ ] Desconectar a integração Lovable ↔ GitHub
- [ ] **Só então:** cancelar a assinatura

## Dívida técnica encontrada (não bloqueia a migração)

- 5 testes já falhavam antes da migração (`exportLeads`, `format-message`) —
  problema de mock, sem relação com a saída da Lovable.
- Bundle principal com 1,7 MB (aviso de chunk grande no build).
- Credenciais do Supabase hardcoded em `src/integrations/supabase/client.ts`.
  Não é falha de segurança (a chave `anon` é pública e protegida por RLS), mas
  o certo é mover para variável de ambiente. Deixado como está de propósito:
  mexer nisso durante a migração adicionaria risco sem ganho.
