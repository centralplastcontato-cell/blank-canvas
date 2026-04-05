

## Plano: Conexão WhatsApp Resiliente

### Problema
O fluxo de conexão falha silenciosamente quando o W-API está lento. O usuário vê "Gerando QR Code..." indefinidamente, sem retry automático, sem indicação de progresso, e sem sugestão de alternativa.

### Alterações

#### 1. Retry automático com backoff no hook (`useWhatsAppConnection.ts`)

- Adicionar estado `retryCount` e `consecutiveFailures`
- No `fetchQrCode`: em caso de timeout ou erro W-API, fazer retry automático (max 3 tentativas) com delay crescente (3s, 6s, 12s) antes de mostrar erro final
- Após 2 falhas consecutivas no QR, sugerir automaticamente o modo "Telefone" via toast
- Timeout adaptativo: começar com 12s, aumentar para 18s na 2a tentativa e 25s na 3a

#### 2. Polling inteligente com backoff (`useWhatsAppConnection.ts`)

- Status polling: aumentar intervalo de 3s para 5s quando houver falhas consecutivas do polling (evita sobrecarga)
- QR refresh: se o fetch anterior ainda estiver em andamento, pular o ciclo (evita requisições empilhadas)

#### 3. Feedback visual melhorado (`ConnectionDialog.tsx`)

- Substituir "Gerando QR Code..." por uma barra de progresso com etapas: "Conectando ao servidor..." → "Gerando QR Code..." → "Tentativa 2 de 3..."
- Mostrar contagem de tentativas e tempo decorrido
- Adicionar botão "Tentar por Telefone" visível durante o loading do QR (não esperar falha total)
- No estado de erro final, mostrar card com duas opções claras: "Tentar QR novamente" e "Conectar por Telefone" (destacado)
- Adicionar indicador visual de "W-API instável" (badge amarelo) quando houver falhas

#### 4. Estado exposto ao dialog (`useWhatsAppConnection.ts`)

- Expor novos estados: `retryCount`, `isRetrying`, `isWapiUnstable`
- O dialog consome esses estados para adaptar a UI

### Arquivos modificados
- `src/hooks/useWhatsAppConnection.ts` — retry, backoff, estados
- `src/components/whatsapp/ConnectionDialog.tsx` — UI de progresso e fallback

### Resultado esperado
- Falhas temporárias do W-API são absorvidas por retry automático (o usuário nem percebe)
- Após falhas persistentes, o sistema guia o usuário para o método alternativo (telefone)
- Feedback visual claro em todas as etapas, sem "tela presa"

