
## Plano: Follow-ups Compactos + Painel de Automações

### Problema
Mensagens de follow-up automáticas poluem o chat, dificultando a leitura das conversas reais com o cliente.

### Solução Híbrida

#### 1. Chip compacto no chat (substituir mensagem de follow-up)
- No `WhatsAppChat.tsx`, detectar mensagens com `metadata.source === 'auto_reminder'`
- Em vez de renderizar a bolha completa, exibir um **chip de 1 linha**: `🤖 Follow-up enviado` com timestamp
- Ao clicar no chip, expandir e mostrar o texto completo da mensagem (accordion/collapse inline)
- Visual: fundo sutil com borda tracejada, ícone de robô, texto discreto em `text-muted-foreground`

#### 2. Botão de robô no cabeçalho do chat
- Adicionar ícone `Bot` (lucide) ao lado do botão `(i)` no cabeçalho da conversa
- Badge com contador de automações enviadas naquela conversa

#### 3. Painel lateral de Timeline de Automações
- Ao clicar no botão do robô, abrir um `Sheet` (lado direito) com:
  - Lista cronológica de todas as mensagens automáticas da conversa
  - Cada item mostra: tipo (FU1, FU2...), data/hora, texto completo
  - Visual de timeline com linha vertical conectando os eventos
- Reutilizar o mesmo padrão do `ContactInfoSheet`

### Arquivos a criar/editar
1. **Criar** `src/components/whatsapp/AutomationTimelineSheet.tsx` — painel lateral com timeline
2. **Criar** `src/components/whatsapp/FollowUpChip.tsx` — chip compacto para o chat
3. **Editar** `src/components/whatsapp/WhatsAppChat.tsx` — adicionar botão no header + integrar chip na renderização de mensagens

### Identificação das mensagens
- Filtro: `metadata.source === 'auto_reminder'` ou `metadata.type` contendo `follow_up`
- Sem alteração no banco de dados — usa dados já existentes
