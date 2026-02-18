
# Padronizar Links para formato `www.dominio.com/path` (sem protocolo)

## Objetivo
Todos os links compartilhados (clipboard) devem seguir o padrão do Freelancer: sem `https://`, usando o domínio customizado limpo. Isso gera links mais curtos e profissionais no WhatsApp.

## Padrão de Referência (Freelancer)
```
www.castelodadiversao.online/freelancer/castelo/monitores
```
- Sem `https://`
- Usa `custom_domain` quando disponível
- Fallback para `window.location.origin` (com protocolo, para dev/preview)

## Arquivos e Alterações

### Grupo 1 — Formulários com Templates (4 arquivos)
Esses arquivos atualmente geram uma URL longa do `og-preview` do Supabase. Serão simplificados para o padrão direto.

| Arquivo | Tipo | Link Atual | Link Novo |
|---------|------|-----------|-----------|
| `src/pages/Avaliacoes.tsx` | Avaliacao | `https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/og-preview?domain=...&path=...` | `www.dominio.com/avaliacao/slug/slug` |
| `src/pages/PreFesta.tsx` | Pre-Festa | Idem og-preview | `www.dominio.com/pre-festa/slug/slug` |
| `src/pages/Contrato.tsx` | Contrato | Idem og-preview | `www.dominio.com/contrato/slug/slug` |
| `src/pages/Cardapio.tsx` | Cardapio | Idem og-preview | `www.dominio.com/cardapio/slug/slug` |

**Mudanca na funcao `copyLink`:** Remover toda a lógica `og-preview` e usar o padrão do Freelancer:
```typescript
const copyLink = (t) => {
  const domain = currentCompany?.custom_domain || '';
  const path = getTemplateUrl(t);
  const fullUrl = domain ? `${domain}${path}` : `${window.location.origin}${path}`;
  navigator.clipboard.writeText(fullUrl);
  toast({ title: "Link copiado!" });
};
```

### Grupo 2 — Agenda Managers (5 arquivos)
Esses usam UUID e precisam de ajuste para usar `custom_domain` sem protocolo.

| Arquivo | Path | Mudanca |
|---------|------|---------|
| `src/components/agenda/EventStaffManager.tsx` | `/equipe/:id` | Adicionar suporte a `custom_domain` + remover protocolo |
| `src/components/agenda/MaintenanceManager.tsx` | `/manutencao/:id` | Remover `https://` do clipboard |
| `src/components/agenda/PartyMonitoringManager.tsx` | `/acompanhamento/:id` | Remover `https://` do clipboard |
| `src/components/agenda/AttendanceManager.tsx` | `/lista-presenca/:id` | Remover `https://` do clipboard |
| `src/components/agenda/EventInfoManager.tsx` | `/informacoes/:id` | Remover `https://` do clipboard |

**Padrao para clipboard (compartilhar):**
```typescript
const baseUrl = currentCompany?.custom_domain || '';
const link = baseUrl ? `${baseUrl}/path/${record.id}` : `${window.location.origin}/path/${record.id}`;
navigator.clipboard.writeText(link);
```

**Botao ExternalLink (abrir):** Mantém `https://` pois o navegador precisa do protocolo para abrir a URL:
```typescript
const baseUrl = currentCompany?.custom_domain ? `https://${currentCompany.custom_domain}` : window.location.origin;
window.open(`${baseUrl}/path/${record.id}`, '_blank');
```

## Resumo
- 9 arquivos modificados
- Links copiados ficam limpos: `www.dominio.com/tipo/...`
- Links de abertura (ExternalLink) mantêm `https://` para funcionar no navegador
- Fallback para `window.location.origin` em ambiente dev/preview
