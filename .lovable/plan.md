
# Proteção Contra Cruzamento de Landing Pages

## Problema

Hoje, se alguém acessar um domínio desconhecido (ou um domínio de buffet ainda não configurado no banco), o sistema simplesmente cai na `DynamicLandingPage` sem saber qual empresa mostrar — podendo exibir conteúdo errado ou uma tela genérica confusa.

Além disso, o **Planeta Divertido** não tem `domain_canonical` preenchido no banco, então quando o domínio `buffetplanetadivertido.com.br` for conectado, o sistema não vai conseguir identificar qual LP mostrar.

## O Que Será Feito

### 1. Banco de Dados — Configurar domain_canonical do Planeta Divertido

Atualizar o registro da empresa "Planeta Divertido" com:
- `custom_domain = 'buffetplanetadivertido.com.br'`
- `domain_canonical = 'buffetplanetadivertido.com.br'`

Isso garante que quando o domínio for apontado para o Lovable, o sistema saberá exatamente qual LP renderizar.

### 2. RootPage.tsx — Adicionar o Planeta Divertido como domínio explícito

Seguindo o mesmo padrão já usado para o Castelo (`castelodadiversao.com.br`), adicionar uma entrada explícita para o Planeta Divertido:

```
// Antes (qualquer domínio desconhecido cai aqui):
return <DynamicLandingPage domain={window.location.hostname} />;

// Depois (domínios conhecidos têm entrada explícita):
if (canonical === "buffetplanetadivertido.com.br") {
  return <DynamicLandingPage domain="buffetplanetadivertido.com.br" />;
}

// Domínio desconhecido → página não encontrada
return <NotFound />;
```

Isso cria um "portão" claro: apenas domínios cadastrados explicitamente conseguem mostrar uma LP. Qualquer domínio não mapeado recebe uma página 404 limpa, sem risco de mostrar a LP errada.

### 3. useDomainDetection.ts — Centralizar a lista de domínios conhecidos

Em vez de espalhar as checagens pelo `RootPage.tsx`, criar uma função `isKnownBuffetDomain()` que centraliza todos os domínios de buffet mapeados. Isso facilita adicionar novos buffets no futuro sem risco de esquecer um passo.

## Estado Atual vs. Estado Após a Implementação

Estado atual:
```
Domínio desconhecido → DynamicLandingPage → comportamento imprevisível
Planeta Divertido (domínio futuro) → não tem domain_canonical → erro
```

Após a implementação:
```
buffetplanetadivertido.com.br → LP do Planeta Divertido ✓
castelodadiversao.com.br → LP do Castelo ✓
castelodadiversao.online → LP de campanha do Castelo ✓
hubcelebrei.com.br → Hub Celebrei ✓
Domínio desconhecido → Página 404 clara ✓
```

## Arquivos a Modificar

- **Banco de dados** (via SQL) → atualizar `companies` do Planeta Divertido com `custom_domain` e `domain_canonical`
- **`src/pages/RootPage.tsx`** → adicionar entrada explícita para Planeta Divertido e proteção 404 para domínios desconhecidos
- **`src/hooks/useDomainDetection.ts`** → adicionar função auxiliar `getKnownBuffetDomain()` para centralizar o mapeamento

## O Que NÃO Muda

- A miniatura do WhatsApp — isso fica para a próxima etapa
- O funcionamento atual do Castelo e do Hub — não serão alterados
- A estrutura interna da `DynamicLandingPage` — ela continua igual

## Importante

Após essa implementação, **qualquer novo buffet** que tiver o domínio conectado precisará de dois passos simples:
1. Atualizar `domain_canonical` no banco (via Hub Empresas)
2. Adicionar uma linha no `RootPage.tsx`

Estamos planejando tornar esse segundo passo automático em uma versão futura, mas por enquanto o processo manual garante segurança total contra cruzamentos.
