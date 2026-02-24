

## Corrigir redirecionamento por limite de convidados no WhatsApp direto

### Problema
Quando o lead vem pela LP, o redirecionamento por limite de convidados (90+) funciona corretamente. Porem, quando o lead fala direto no WhatsApp e seleciona "+ DE 90 PESSOAS", o bot **nao redireciona** -- continua o fluxo normal.

### Causa raiz
As configuracoes de limite de convidados estao na tabela `lp_bot_settings` (guest_limit=90, mensagem personalizada, nome do parceiro), mas a tabela `wapi_bot_settings` tem esses campos como **null**. O webhook (`wapi-webhook`) so consulta `wapi_bot_settings`, entao nunca encontra o limite configurado.

```text
lp_bot_settings (Planeta Divertido):
  guest_limit = 90
  guest_limit_message = "Nossa capacidade maxima e de 90 convidados..."
  guest_limit_redirect_name = "Buffet Mega Magic"

wapi_bot_settings (Planeta Divertido):
  guest_limit = null        <-- problema!
  guest_limit_message = null
  guest_limit_redirect_name = null
```

### Solucao

**Arquivo: `supabase/functions/wapi-webhook/index.ts`**

No trecho onde o bot verifica o limite de convidados (linha ~2244), adicionar fallback para `lp_bot_settings` quando `wapi_bot_settings.guest_limit` for null:

1. Apos carregar `settings` de `wapi_bot_settings`, verificar se `guest_limit` e null
2. Se for null, buscar `lp_bot_settings` pela `company_id` da instancia
3. Usar os valores de `lp_bot_settings` como fallback (guest_limit, guest_limit_message, guest_limit_redirect_name)

```text
// Antes do guest limit check (~linha 2241):
// Fallback: if wapi_bot_settings has no guest_limit, check lp_bot_settings
let effectiveGuestLimit = settings.guest_limit;
let effectiveGuestLimitMessage = settings.guest_limit_message;
let effectiveGuestLimitRedirectName = settings.guest_limit_redirect_name;

if (!effectiveGuestLimit) {
  const { data: lpSettings } = await supabase
    .from('lp_bot_settings')
    .select('guest_limit, guest_limit_message, guest_limit_redirect_name')
    .eq('company_id', instance.company_id)
    .single();
  
  if (lpSettings?.guest_limit) {
    effectiveGuestLimit = lpSettings.guest_limit;
    effectiveGuestLimitMessage = lpSettings.guest_limit_message;
    effectiveGuestLimitRedirectName = lpSettings.guest_limit_redirect_name;
  }
}

// Usar effectiveGuestLimit no lugar de settings.guest_limit
```

4. Substituir todas as referencias a `settings.guest_limit`, `settings.guest_limit_message` e `settings.guest_limit_redirect_name` no bloco de guest limit check pelas variaveis `effective*`

### Arquivos a editar

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/wapi-webhook/index.ts` | Fallback para lp_bot_settings quando guest_limit e null |

### Resultado esperado
- Leads que vem pelo WhatsApp direto e selecionam "+ DE 90 PESSOAS" serao redirecionados para o Buffet Mega Magic, usando a mesma mensagem configurada no Bot LP
- Nao e necessario configurar o limite em dois lugares -- basta configurar no Bot LP e o WhatsApp herda
- Se o admin configurar explicitamente em `wapi_bot_settings`, esse valor tem prioridade
- Leads da LP continuam funcionando normalmente (sem mudanca)
