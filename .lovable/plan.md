

## Reparo Automatico de Sessao Incompleta (sem reconexao manual)

### Diagnostico Confirmado

A instancia `LITE-4IW93E-MGVYDW` esta neste estado agora:

```text
Endpoints W-API:
  /instance/status         -> 404
  /instance/info           -> 404
  /instance/connection-state -> 404
  /instance/profile        -> 404
  /instance/qr-code        -> 200 {"connected": true}  (SEM phone)
```

O painel da W-API mostra o numero `553497310669` vinculado. Ou seja, a conexao esta valida no provedor, mas a API nao retorna o telefone nos endpoints que nosso sistema consulta. Provavelmente e uma limitacao do plano LITE.

### Solucao: Acao "repair-session" + botao "Reparar Sessao"

Em vez de exigir desconectar/reconectar, vamos criar um mecanismo de reparo que:

1. Tenta extrair o telefone de endpoints alternativos da W-API
2. Se nao conseguir, permite que o usuario informe manualmente o numero (visivel no painel W-API)
3. Atualiza o banco com o telefone e marca como `connected`, desbloqueando os envios

### Arquivos e mudancas

**1. `supabase/functions/wapi-send/index.ts`** - Nova acao `repair-session`

- Recebe `instanceId`, `instanceToken`, e opcionalmente `manualPhone`
- Tenta extrair telefone de:
  - `/instance/qr-code` (campo `phone`, `me.id`, variacoes)
  - `/instance/me` (endpoint alternativo)
  - `/instance/status` com query params diferentes
- Se `manualPhone` fornecido pelo usuario, valida formato e usa diretamente
- Se encontrar telefone (automatico ou manual), atualiza `wapi_instances` com `status: 'connected'` e `phone_number`
- Retorna `{ repaired: true, phoneNumber }` ou `{ repaired: false, reason }` explicando o que aconteceu

**2. `src/components/whatsapp/settings/ConnectionSection.tsx`** - Botao "Reparar Sessao"

- Quando instancia esta `degraded`, mostrar botao amarelo "Reparar Sessao" ao lado de "Conectar"
- Ao clicar: chama `repair-session` sem telefone manual (tentativa automatica)
- Se falhar: abre mini-dialog pedindo o numero (com instrucao: "Copie o numero do painel W-API")
- Se reparar: atualiza lista, mostra toast de sucesso

**3. `src/components/whatsapp/WhatsAppChat.tsx`** - Banner de sessao degradada

- Quando a instancia selecionada esta com `status: 'degraded'`, mostrar banner no topo do chat com:
  - "Sessao incompleta - mensagens nao serao entregues"
  - Botao "Reparar" que chama a mesma logica de reparo

### Fluxo do reparo

```text
Usuario clica "Reparar Sessao"
        |
        v
wapi-send action=repair-session
        |
        v
Tenta endpoints alternativos para pegar telefone
        |
   Encontrou?
   /       \
  Sim       Nao
   |         |
   v         v
Atualiza    Pede telefone
DB como     manual ao
connected   usuario
   |         |
   v         v
Desbloqueia Atualiza DB
envios      e desbloqueia
```

### Detalhes tecnicos

- A acao `repair-session` nao altera nenhuma logica de preflight existente - apenas corrige o estado no banco
- O preflight continua bloqueando envios se `phone_number` for null, garantindo seguranca
- A validacao do telefone manual aceita formatos `55XXXXXXXXXX` (11-13 digitos)
- Logs estruturados: `[repair-session] attempted for {instanceId}, result: {repaired|failed}, source: {auto|manual}`

### Risco

- **Baixo**: se o reparo manual usar um telefone errado, o pior caso e que as mensagens vao para o numero errado no provedor (mas o provedor ja tem o numero certo, entao isso nao deveria acontecer)
- O sistema continua bloqueando envios ate que o telefone seja preenchido - nenhum "falso enviado" possivel
