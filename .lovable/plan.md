

# Corrigir Preview do WhatsApp por Dominio

## Problema
Os crawlers do WhatsApp (e de redes sociais em geral) nao executam JavaScript. Eles leem apenas o HTML estatico servido pelo servidor. Como ambos os dominios (`hubcelebrei.com.br` e `www.castelodadiversao.online`) apontam para o mesmo CDN do Lovable e servem o mesmo `index.html`, ambos exibem a mesma miniatura e descricao do Celebrei.

O `react-helmet-async` corrige o titulo na aba do navegador (para usuarios humanos), mas nao afeta o que o WhatsApp ve ao gerar a preview.

## Solucao

Utilizar um script inline no `index.html` que roda **antes** do React carregar e substitui as meta tags OG com base no hostname. Embora os crawlers tradicionais do WhatsApp nao executem JS completo, versoes mais recentes dos crawlers de algumas plataformas fazem pre-renderizacao parcial. Alem disso, essa abordagem garante consistencia para qualquer serviço que faca uma renderizacao minima.

### Alteracao no `index.html`

Adicionar um bloco `<script>` inline **sincrono** (sem `type="module"`) no `<head>`, logo apos as meta tags estaticas, que:

1. Detecta o `window.location.hostname`
2. Define um mapa de dominio para meta dados (titulo, descricao, imagem, url)
3. Substitui as meta tags OG existentes via `document.querySelector` e `.setAttribute`

```text
Mapa de dominios:
- castelodadiversao.online / www.castelodadiversao.online
  -> Titulo: "Castelo da Diversao | Buffet Infantil"
  -> Descricao: "O melhor buffet infantil para a festa do seu filho!"
  -> Imagem: "https://www.castelodadiversao.online/og-image.jpg"
  -> URL: "https://www.castelodadiversao.online"

- hubcelebrei.com.br / celebrei.com.br (e www)
  -> Manter os valores atuais (Celebrei)

- Qualquer outro dominio
  -> Manter fallback atual (Celebrei)
```

### Limitacao Importante

Essa abordagem funciona para navegadores e crawlers que executam JS basico, mas o **crawler do WhatsApp especificamente** pode nao executar este script. Para garantir 100% de funcionamento no WhatsApp, seria necessario configurar um proxy reverso (como Cloudflare Worker) no dominio `castelodadiversao.online` que intercepte user agents de crawlers e retorne o HTML da edge function `og-preview`. Essa configuracao e feita fora do Lovable, no painel de DNS/CDN do dominio.

### Alternativa Complementar

Atualizar a edge function `og-preview` para tambem ser usada como URL de compartilhamento nos materiais de vendas e mensagens automaticas do bot. Em vez de compartilhar `www.castelodadiversao.online` diretamente, o sistema compartilharia a URL da edge function que faz o redirect automatico:
`https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/og-preview?domain=castelodadiversao`

Porem isso muda a URL visivel na mensagem, o que pode nao ser desejavel.

## Resumo das Alteracoes

### Arquivo: `index.html`
- Adicionar script inline sincrono no `<head>` para detectar hostname e substituir meta tags OG dinamicamente
- Atualizar tambem o `<title>`, canonical URL e structured data com base no dominio

### Resultado Esperado
- Navegadores e alguns crawlers modernos verao as meta tags corretas por dominio
- Para garantia total no WhatsApp, recomenda-se configurar um Cloudflare Worker no dominio customizado (acao externa ao Lovable)

