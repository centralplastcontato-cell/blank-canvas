
## Restart de Instancia W-API para Corrigir Sessao Corrompida

### Problema Real

O reparo anterior corrigiu o estado no banco de dados, mas a sessao criptografica do WhatsApp continua corrompida no provedor. A W-API aceita o envio (retorna `messageId`), mas o WhatsApp mostra "Aguardando mensagem" porque as chaves de criptografia estao invalidas. Precisamos de um **restart da instancia** no provedor para refrescar a sessao sem exigir novo QR code.

### Solucao

Adicionar uma acao `restart-instance` no edge function que tenta reiniciar a instancia na W-API, e um botao na UI para o usuario acionar isso.

### Arquivos e Mudancas

**1. `supabase/functions/wapi-send/index.ts`** - Nova acao `restart-instance`

- Tenta multiplos endpoints de restart da W-API (a API pode ter variantes):
  - `POST /instance/restart?instanceId=X`
  - `PUT /instance/restart?instanceId=X`
  - `POST /instance/reboot?instanceId=X`
  - `GET /instance/reboot?instanceId=X`
- Se algum retornar sucesso, aguarda 3 segundos e verifica status com `get-qr` (que ja sabemos retorna 200)
- Atualiza `wapi_instances` conforme resultado
- Se nenhum endpoint funcionar, retorna erro sugerindo desconectar/reconectar manualmente
- Logs estruturados: `[restart-instance] attempted for {instanceId}, endpoint: {url}, result: {success|failed}`

**2. `src/components/whatsapp/settings/ConnectionSection.tsx`** - Botao "Reiniciar Instancia"

- Para instancias `degraded` ou `connected`: adicionar botao "Reiniciar" (icone de refresh) que chama `restart-instance`
- Mostra loading durante o processo
- Toast de sucesso ou erro conforme resultado
- Se o restart falhar, sugere desconectar e reconectar

**3. `src/components/whatsapp/WhatsAppChat.tsx`** - Atualizar banner degraded

- No banner de sessao degradada, adicionar botao "Reiniciar" alem do "Reparar"
- O fluxo seria: primeiro tenta "Reiniciar" (restart da sessao no provedor), se falhar tenta "Reparar" (corrigir phone no banco)

### Fluxo

```text
Usuario clica "Reiniciar Instancia"
        |
        v
wapi-send action=restart-instance
        |
        v
Tenta POST /instance/restart
        |
   Funcionou?
   /       \
  Sim       Nao
   |         |
   v         v
Aguarda    Tenta endpoints
3s e       alternativos
verifica   (reboot, etc)
status     |
   |    Funcionou?
   |    /       \
   |  Sim      Nao
   |   |        |
   v   v        v
Sessao       Sugere
restaurada   desconectar
toast ok     e reconectar
```

### Por que isso resolve

O "Aguardando mensagem" acontece porque as chaves de criptografia end-to-end da sessao ficaram invalidas. Um restart da instancia forca o provedor a re-negociar as chaves com o servidor do WhatsApp, restaurando a capacidade de entrega sem precisar de novo QR code. E o equivalente a "reiniciar o WhatsApp Web" quando ele trava.

### Risco

- **Baixo**: o restart e uma operacao padrao dos provedores WhatsApp. No pior caso, se o restart forcar logout, o usuario precisara reconectar via QR (mesmo resultado que teria sem essa feature)
- O sistema continua bloqueando envios se a instancia estiver degraded
