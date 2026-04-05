

## Pesquisa da Documentação Z-API -- Resultados e Plano Atualizado

### Resultados da Pesquisa

A documentação da Z-API foi validada com sucesso. A API é compatível com o nosso sistema e o mapeamento de endpoints está confirmado.

---

### Mapeamento Completo: W-API vs Z-API

#### Base URL
- **W-API**: `https://w-api.app/v1/{instance_id}/...?token={token}`
- **Z-API**: `https://api.z-api.io/instances/{instance_id}/token/{token}/...`
- **Z-API requer header extra**: `Client-Token: {account_security_token}`

#### Endpoints Confirmados

| Acao | W-API | Z-API | Diferenca de Payload |
|------|-------|-------|---------------------|
| Enviar texto | `POST .../send-text` | `POST .../send-text` | Igual: `{ phone, message }` |
| Enviar imagem | `POST .../send-image` | `POST .../send-image` | W-API: `{ phone, url, caption }` / Z-API: `{ phone, image, caption }` |
| Enviar audio | `POST .../send-audio` | `POST .../send-audio` | W-API: `{ phone, url }` / Z-API: `{ phone, audio, waveform }` |
| Enviar documento | `POST .../send-document` | `POST .../send-document/{ext}` | W-API: `{ phone, url, fileName }` / Z-API: `{ phone, document, fileName }` (extensao na URL) |
| Enviar video | `POST .../send-video` | `POST .../send-video` | W-API: `{ phone, url }` / Z-API: `{ phone, video }` |
| Obter QR Code | `GET .../qrcode` | `GET .../qr-code/image` | Z-API retorna base64 da imagem |
| Parear por telefone | N/A (pairing code) | `GET .../phone-code/{phone}` | Z-API retorna codigo diretamente |
| Status | `GET .../status` | `GET .../status` | W-API: `{ status }` / Z-API: `{ connected, smartphoneConnected, error }` |
| Desconectar | `GET .../disconnect` | `GET .../disconnect` | Compativel |
| Configurar webhooks | Individual | `PUT .../update-every-webhooks` | Z-API: `{ value: "url" }` configura todos de uma vez |

#### Webhook de Mensagem Recebida (Z-API)

Formato confirmado do payload:
```json
{
  "instanceId": "A20DA9C...",
  "phone": "5544999999999",
  "fromMe": false,
  "messageId": "A20DA9C...",
  "status": "RECEIVED",
  "chatName": "nome",
  "senderName": "nome",
  "type": "ReceivedCallback",
  "text": { "message": "conteudo" },
  "image": { "imageUrl": "...", "caption": "..." },
  "audio": { "audioUrl": "..." },
  "video": { "videoUrl": "...", "caption": "..." },
  "document": { "documentUrl": "...", "fileName": "..." }
}
```

#### Diferencas Criticas Identificadas

1. **Header `Client-Token`**: Obrigatorio em TODAS as requisicoes Z-API (token de seguranca da conta, diferente do token da instancia)
2. **Campos de midia diferentes**: W-API usa `url` para midias, Z-API usa nomes especificos (`image`, `audio`, `document`, `video`)
3. **Documento requer extensao na URL**: Z-API exige `/send-document/{extensao}` 
4. **Status retorna booleano**: Z-API retorna `{ connected: boolean }` em vez de string de status
5. **Webhook payload estruturado diferente**: Z-API usa objetos aninhados (`text.message`, `image.imageUrl`) em vez de campos planos
6. **Expiracao de midia**: Arquivos recebidos pela Z-API expiram em 30 dias

---

### Plano de Implementacao Atualizado

#### Fase 1: Banco de Dados
- Adicionar colunas `provider TEXT DEFAULT 'wapi'` e `client_token TEXT` na tabela `wapi_instances`
- Nenhuma instancia existente e afetada

#### Fase 2: Secret
- Nao precisamos de secret global -- o `client_token` sera armazenado por instancia na coluna nova

#### Fase 3: Edge Function `wapi-send`
- Apos resolver credenciais, ler `provider` e `client_token` da instancia
- Criar funcoes auxiliares para Z-API:
  - `zapiRequest(instanceId, token, clientToken, path, method, body)` -- igual a `wapiRequest` mas com base URL e header diferentes
  - Adaptadores de payload por acao (mapear `url` para `image`/`audio`/`document`/`video`)
  - Adaptador de status (converter `{ connected: boolean }` para formato interno)

#### Fase 4: Edge Function `wapi-webhook`
- No inicio do handler, detectar formato Z-API pelo campo `type === "ReceivedCallback"` ou presenca de `instanceId` no payload
- Normalizar para formato interno: extrair `text.message` para `content`, `image.imageUrl` para `media_url`, etc.
- Resolver instancia pelo `instanceId` do payload Z-API

#### Fase 5: Frontend
- `ConnectionSection.tsx`: Select "Provedor" (W-API / Z-API) + campo `Client Token` ao criar instancia
- `HubWhatsApp.tsx`: Badge visual do provedor
- `ConnectionDialog.tsx`: Sem mudancas (QR e telefone funcionam igual)

#### Arquivos Modificados
- `supabase/migrations/` -- nova migracao
- `supabase/functions/wapi-send/index.ts` -- router + adaptadores Z-API
- `supabase/functions/wapi-webhook/index.ts` -- normalizacao de payload
- `src/components/whatsapp/settings/ConnectionSection.tsx` -- UI de provedor
- `src/pages/HubWhatsApp.tsx` -- badge de provedor

