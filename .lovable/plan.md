

# Plano de Integração: SaaS Custom Domains no Celebrei

## Problema Atual
Cada empresa no Hub Celebrei pode ter seu domínio customizado (ex: `buffetxyz.com.br`), mas quando alguém compartilha o link no WhatsApp/Facebook, a miniatura e as informações que aparecem são sempre as mesmas (do Celebrei) em vez de serem da empresa específica. Isso acontece porque o app é uma SPA (Single Page Application) e os robôs das redes sociais não executam JavaScript.

## Por que o SaaS Custom Domains resolve isso
A API do serviço possui campos nativos por domínio:
- **meta_title** - Título que aparece no preview
- **meta_description** - Descrição do preview
- **meta_image_url** - Imagem da miniatura (OG image)
- **meta_favicon_url** - Favicon do navegador

Ou seja, o serviço injeta automaticamente os meta tags corretos para cada domínio ANTES do HTML chegar ao navegador/crawler. Sem necessidade de Cloudflare Worker ou Edge Function para interceptar bots.

## Como funciona a arquitetura

```text
Visitante/Bot acessa buffetxyz.com.br
          |
          v
  SaaS Custom Domains (proxy reverso)
    - Injeta meta tags OG corretos
    - SSL automático
    - DDoS protection
          |
          v
  Lovable App (upstream: naked-screen-charm.lovable.app)
    - Serve o SPA normalmente
    - RootPage detecta domínio e carrega LP dinâmica
```

## Etapas de Implementação

### 1. Configuração Inicial no SaaS Custom Domains
- Criar conta em app.saascustomdomains.com
- Criar um **Upstream** apontando para o domínio publicado do Lovable (`naked-screen-charm.lovable.app`, porta 443, TLS habilitado)
- Obter a API key nas configurações

### 2. Salvar API Key como Secret
- Adicionar `SCD_API_TOKEN` como secret do projeto no Lovable
- Adicionar `SCD_ACCOUNT_UUID` e `SCD_UPSTREAM_UUID` como secrets

### 3. Criar Edge Function `manage-custom-domain`
Uma nova Edge Function que será chamada quando uma empresa cadastrar/atualizar seu domínio customizado no Hub. Ela fará:
- **POST** para criar o domínio no SaaS Custom Domains com os meta tags OG corretos (título, descrição, imagem da empresa)
- **PUT** para atualizar quando a empresa mudar logo/nome
- **DELETE** para remover quando necessário
- Retornar as instruções DNS (CNAME) que o cliente precisa configurar

### 4. Atualizar o Fluxo de Cadastro de Domínio no Hub
No painel de administração (Hub Empresas), quando o admin configurar o domínio customizado de uma empresa:
- Chamar a Edge Function para registrar o domínio no SaaS Custom Domains
- Exibir as instruções DNS retornadas (CNAME record) para o cliente
- Mostrar o status do domínio (pendente, ativo, erro)

### 5. Sincronizar Meta Tags com Dados da LP
Quando a landing page de uma empresa for atualizada (hero title, subtitle, logo), atualizar automaticamente os meta tags no SaaS Custom Domains via API.

### 6. Simplificação - Remover Workarounds
- A Edge Function `og-preview` pode ser mantida como fallback, mas não será mais necessária para os domínios gerenciados pelo SaaS Custom Domains
- O script inline no `index.html` para override de OG por domínio pode ser simplificado
- O Cloudflare Worker de interceptação de bots não será mais necessário

## Detalhes Técnicos

### Edge Function `manage-custom-domain`
Endpoints da API que serão usados:
- `POST /api/v1/accounts/:account_uuid/upstreams/:upstream_uuid/custom_domains` - Criar domínio
- `PUT /api/v1/accounts/:account_uuid/upstreams/:upstream_uuid/custom_domains/:uuid` - Atualizar
- `DELETE /api/v1/accounts/:account_uuid/upstreams/:upstream_uuid/custom_domains/:uuid` - Remover

Campos enviados ao criar/atualizar:
```text
{
  "custom_domain": {
    "host": "buffetxyz.com.br",
    "meta_title": "Buffet XYZ | Buffet Infantil",
    "meta_description": "O melhor buffet para a festa do seu filho!",
    "meta_image_url": "https://storage.../logo-buffet-xyz.jpg",
    "meta_favicon_url": "https://storage.../favicon-xyz.png"
  }
}
```

### Mudança no DNS dos clientes
Em vez de apontar para o IP do Lovable/Cloudflare, os clientes apontarão um **CNAME** para o endereço fornecido pelo SaaS Custom Domains. O serviço cuida do SSL automaticamente.

### Banco de Dados
Adicionar coluna `scd_domain_uuid` na tabela `companies` para armazenar o ID do domínio no SaaS Custom Domains, permitindo atualizações e exclusões futuras.

## Pré-requisitos
1. Criar conta no SaaS Custom Domains (tem free trial)
2. Configurar o upstream apontando para o Lovable
3. Gerar API token
4. Compartilhar as 3 credenciais (API token, Account UUID, Upstream UUID) para salvar como secrets no projeto

