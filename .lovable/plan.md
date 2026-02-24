
# Diagnostico: Mensagens nao chegando na plataforma (Planeta Divertido)

## Problema encontrado

A instancia W-API do Planeta Divertido (`LITE-YGE96V-MKGKLK`) esta com problemas graves:

1. **A API W-API retorna 404** para todas as chamadas (get-status, configure-webhooks, etc.)
2. **O webhook NAO esta configurado** - por isso mensagens individuais nao estao chegando
3. **So existem 6 conversas de grupo** no sistema, zero conversas individuais
4. O banco de dados mostra a instancia como "connected", mas a W-API nao reconhece mais a instancia

## Causa raiz

A instancia `LITE-YGE96V-MKGKLK` provavelmente foi desativada, expirou ou foi recriada no painel da W-API (w-api.app). Quando a API retorna 404, significa que o ID da instancia nao existe mais no servidor deles.

## O que precisa ser feito

### Passo 1: Verificar a instancia no painel W-API
- Acessar o painel da W-API (w-api.app) e verificar se a instancia `LITE-YGE96V-MKGKLK` ainda existe
- Se nao existir, criar uma nova instancia

### Passo 2: Atualizar credenciais (se necessario)
Se a instancia foi recriada com novo ID/token:
- Acessar Configuracoes > WhatsApp > Conexao na plataforma
- Editar a instancia do Planeta Divertido com o novo `instance_id` e `instance_token`

### Passo 3: Reconectar e configurar webhooks
- Na plataforma, clicar para reconectar (QR code ou telefone)
- O sistema tentara automaticamente configurar os webhooks apos a conexao

### Passo 4: Melhoria no codigo (preventiva)
Adicionar tratamento mais robusto no `wapi-send` para o caso de respostas 404 da W-API, alertando o usuario de que a instancia precisa ser reconfigurada ao inves de falhar silenciosamente.

---

## Detalhes tecnicos

### Evidencias do diagnostico

```text
Logs do wapi-send:
- get-status info response: 404
- get-status connection-state response: 404  
- get-status profile response: 404
- configure-webhooks: SyntaxError (HTML 404 page instead of JSON)
```

### Arquivo a modificar
`supabase/functions/wapi-send/index.ts`:
- Na acao `configure-webhooks` (linha ~891), adicionar verificacao de resposta HTML/404 antes de tentar `res.json()`
- Retornar erro informativo ao usuario quando a instancia nao existe mais na W-API

### Banco de dados
- Tabela `wapi_instances`: atualizar `status` para `disconnected` quando a W-API retornar 404 consistentemente
- Nenhuma migration necessaria

### Acoes imediatas recomendadas
O usuario precisa verificar no painel da W-API (w-api.app) se a instancia `LITE-YGE96V-MKGKLK` ainda existe e esta ativa. Caso contrario, recria-la e atualizar as credenciais na plataforma.
