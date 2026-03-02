
## Tela de Detalhes da Campanha

Atualmente, ao clicar em uma campanha, so abre o dialogo de envio se ela estiver em "draft". Campanhas concluidas ou com erros nao sao clicaveis. A ideia e criar uma tela/sheet de detalhes que abre ao clicar em qualquer campanha, mostrando metricas, lista de destinatarios e opcao de reenvio.

### O que sera criado

**1. Novo componente `CampaignDetailSheet.tsx`** em `src/components/campanhas/`

Um Sheet (painel lateral) que abre ao clicar em qualquer campanha, contendo:

- **Cabecalho**: nome da campanha, status (badge), descricao e data de criacao
- **Cards de metricas**: Total de destinatarios, Enviados (verde), Erros (vermelho), Pendentes (amarelo)
- **Lista de destinatarios**: tabela/lista com nome, telefone, status (icone + badge) e mensagem de erro (quando houver)
- **Botao "Reenviar com erro"**: seleciona automaticamente os destinatarios com status "error", reseta o status para "pending" no banco e abre o `CampaignSendDialog` para reenviar apenas esses contatos

**2. Modificar `Campanhas.tsx`**

- Adicionar estado `detailCampaign` para controlar qual campanha esta aberta no sheet
- Ao clicar em qualquer card de campanha (nao so draft), abrir o `CampaignDetailSheet`
- Manter o fluxo atual: se a campanha for draft, o sheet tera um botao "Iniciar Envio" que abre o `CampaignSendDialog`

### Layout do Sheet (mobile-first)

```text
+----------------------------------+
|  [X]  Ferias de Julho            |
|  Concluida  ·  01/03/2026       |
|  Promocao especial para festas   |
+----------------------------------+
|  [1]Total  [0]Enviados  [0]Erros |
+----------------------------------+
|  Lista de Destinatarios          |
|  Nome        Telefone   Status   |
|  Joao Silva  119999...  ✓ Env.  |
|  Maria       119888...  ✗ Erro  |
|  ...                             |
+----------------------------------+
|  [ Reenviar para erros (2) ]     |
+----------------------------------+
```

### Detalhes tecnicos

**Arquivo novo:** `src/components/campanhas/CampaignDetailSheet.tsx`
- Props: `campaign: Campaign | null`, `open`, `onOpenChange`, `companyId`, `onResend(campaign)`
- Busca `campaign_recipients` do Supabase filtrado por `campaign_id`, todos os status
- Agrupa metricas localmente (sent, error, pending)
- Lista com ScrollArea, mostrando nome, telefone formatado, badge de status
- Para erros, mostrar a `error_message` em tooltip ou texto pequeno
- Botao de reenvio: atualiza `campaign_recipients` com status "error" para "pending", reseta `error_message`, atualiza contadores da campanha, e chama `onResend(campaign)`

**Arquivo editado:** `src/pages/Campanhas.tsx`
- Importar `CampaignDetailSheet`
- Novo estado `detailCampaign`
- onClick do card: sempre abre o detail sheet (remover condicao de draft-only)
- No sheet, se for draft, mostrar botao "Iniciar Envio" que abre o `CampaignSendDialog`
- Apos reenvio concluido, recarregar campanhas
