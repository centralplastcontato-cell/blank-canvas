

## Corrigir redirecionamento por limite de convidados no WhatsApp direto

### Problema
Quando o lead fala direto no WhatsApp e seleciona "+ DE 90 PESSOAS", o bot nao redireciona. Isso acontece porque o codigo so consulta `wapi_bot_settings`, onde `guest_limit` esta null. A configuracao correta esta em `lp_bot_settings`.

### Solucao

**Arquivo: `supabase/functions/wapi-webhook/index.ts`**

Inserir um bloco de fallback **antes** da linha 2241 (guest limit check), que busca `lp_bot_settings` quando os campos de guest limit estao vazios em `wapi_bot_settings`:

```text
// Antes da linha 2241, inserir:
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
```

Depois, substituir todas as referencias no bloco de guest limit check (linhas 2244-2310):
- `settings.guest_limit` -> `effectiveGuestLimit`
- `settings.guest_limit_message` -> `effectiveGuestLimitMessage`
- `settings.guest_limit_redirect_name` -> `effectiveGuestLimitRedirectName`

### Resultado esperado
- Leads pelo WhatsApp direto que selecionam acima do limite serao redirecionados usando a config do Bot LP
- Se `wapi_bot_settings` tiver guest_limit preenchido, esse valor tem prioridade
- Leads da LP continuam funcionando normalmente
- So precisa configurar o limite em um lugar (Bot LP)
