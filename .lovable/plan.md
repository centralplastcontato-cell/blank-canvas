

## Tornar a legenda do video promo realmente configuravel e remover hardcode de meses

### Problema identificado
O cliente nao esta fazendo promocao, mas o bot envia o video com a legenda "Promocao especial! Garanta sua festa em Marco!" porque:

1. **Legenda fallback hardcoded**: Se a tabela `sales_material_captions` nao tem uma entrada para `video_promo`, o sistema usa o fallback "Promocao especial! Garanta sua festa em {mes}!"
2. **Meses de promocao hardcoded**: O backend verifica `month === 'Fevereiro' || month === 'Marco'` para decidir se envia o video promo. Isso nao deveria ser fixo.
3. **Filtro por nome**: Videos com "promo" ou "carnaval" no nome sao automaticamente classificados como promocionais, o que pode pegar videos que nao sao de promocao.

### Solucao

**1. Mudar o fallback da legenda para algo neutro (2 arquivos)**

Arquivos: `supabase/functions/wapi-webhook/index.ts` e `supabase/functions/follow-up-check/index.ts`

Trocar o fallback de:
```
captionMap['video_promo'] || `🎭 Promoção especial! Garanta sua festa em ${month}! 🎉`
```
Para:
```
captionMap['video_promo'] || captionMap['video'] || `🎬 Confira nosso video! ✨`
```

Assim, se nao ha legenda promo configurada, usa a legenda normal de video, e se nenhuma existe, usa um texto generico neutro.

**2. Remover restricao de meses hardcoded**

Nos mesmos 2 arquivos, remover a verificacao `isPromoMonth` para que o video promo seja enviado independentemente do mes (ja que a flag `auto_send_promo_video` controla se deve enviar ou nao):

Antes:
```
if (sendPromoVideo && isPromoMonth && promoVideos.length > 0)
```
Depois:
```
if (sendPromoVideo && promoVideos.length > 0)
```

Isso permite que o admin controle o envio do video promo apenas pela flag `auto_send_promo_video` nas configuracoes, sem restricao de mes.

### Arquivos a editar

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/wapi-webhook/index.ts` | Fallback neutro na legenda + remover `isPromoMonth` |
| `supabase/functions/follow-up-check/index.ts` | Mesmas mudancas |

### Resultado esperado
- Videos promo usam a legenda configurada pelo admin no CaptionsCard
- Se nenhuma legenda promo foi configurada, aparece texto generico neutro (sem mencionar promocao)
- O envio do video promo e controlado apenas pela flag `auto_send_promo_video`, sem restricao de mes
- O admin continua podendo personalizar a legenda via Configuracoes > Legendas

