## Diagnóstico

Você tem razão — não foi um caso isolado. É um efeito colateral de uma mudança feita no fluxo de **recuperação de bot travado** (`follow-up-check`).

**O que acontece hoje:**

1. O lead chega pela LP/WhatsApp → o `wapi-webhook` envia o fluxo normal (boas-vindas, perguntas, fotos, menu). Essas mensagens vão para o banco **sem nenhuma tag de automação** → a UI exibe normalmente, como sempre foi.

2. Mas se a conversa ficar parada por um tempo (lead não respondeu rápido, instância caiu, etc.), o cron `follow-up-check` entra e **reenvia o mesmo fluxo do bot** (boas-vindas → nome → mês → dia → convidados → fotos → menu). E aqui está o problema: **toda mensagem inserida por esse caminho é marcada com `metadata: { source: 'stuck_bot_recovery' }`** (8 pontos de inserção em `supabase/functions/follow-up-check/index.ts`, incluindo as fotos do carrossel em `recoverySendMaterials`).

3. No frontend, `isAutomationMessage` trata `stuck_bot_recovery` como automação → o `WhatsAppChat` renderiza cada mensagem como `<FollowUpChip label="Recuperação de bot" />`, que é o card minimizado/cinza pontilhado.

Por isso, em conversas onde o cron precisou completar o fluxo, **tudo aparece como "Recuperação de bot"** em vez do balão normal — exatamente o sintoma que você descreveu na conversa do Aventura Kids.

## Correção

Voltar ao comportamento original: mensagens do fluxo do bot (mesmo quando enviadas pelo recuperador) aparecem como mensagens normais no chat. O chip minimizado fica reservado **apenas para automações reais** (follow-up, lembrete, reativação, confirmação de visita).

### Mudanças

**1. `supabase/functions/follow-up-check/index.ts`** — remover `metadata: { source: 'stuck_bot_recovery' }` dos 8 inserts em `wapi_messages`:

- linha ~2156 (welcome)
- linha ~2191 (resposta inválida)
- linha ~2229 (transferência cliente já é nosso)
- linha ~2257 (trabalhe conosco)
- linha ~2312 (mensagem de conclusão)
- linha ~2369 (próxima pergunta após materiais)
- linha ~2402 (progressão normal)
- linha ~2547 (`saveMessage` em `recoverySendMaterials` — fotos, vídeos, PDFs, textos)

Cada um vira `metadata: { source: 'bot' }` (igual ao que o webhook usa para mensagens do bot — linha 3594 de `wapi-webhook/index.ts`). Assim o histórico continua rastreável internamente, mas a UI trata como mensagem normal do bot.

**2. Sem mudanças em `FollowUpChip.tsx` / `WhatsAppChat.tsx`** — eles continuam funcionando como sempre: chip minimizado para `auto_reminder`, `reactivation_engine`, `visit_confirmation`, `reactivation_4b`. O `stuck_bot_recovery` simplesmente deixa de existir como categoria visual.

**3. Mensagens antigas já marcadas** — não vou alterar histórico (seria invasivo). A correção vale para mensagens novas. Se quiser, depois posso rodar um update SQL pontual para "destaguear" o backlog.

## Resultado

- Lead chega → recebe fluxo normal exibido como balões normais no chat (boas-vindas, perguntas, fotos do carrossel, menu) — **independentemente** de ter sido o webhook em tempo real ou o cron de recuperação que enviou.
- Chip minimizado "Bot" continua aparecendo **só** para follow-up, lembretes e reativação — que é o comportamento que você quer preservar.
