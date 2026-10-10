# Passagem de chat — Plataforma Celebrei (Castelo da Diversão)

> **Para o novo chat:** leia este arquivo inteiro antes de começar. Ele resume as regras, o jeito de trabalhar e o estado atual combinados no chat anterior (outubro/2026). Responda sempre em português, de forma simples — o dono não é programador.

---

## 1. Contexto

- **Celebrei** é a plataforma (CRM + atendimento WhatsApp + agenda + formulários + IA) usada pelo **Castelo da Diversão** (buffet infantil em Sorocaba) e por outros buffets.
- Frontend: React + Vite, publicado na **Vercel** a cada merge na `main` (domínios `castelodadiversao.online` e `www.castelodadiversao.com.br`).
- Backend: **Supabase** (projeto `rsezgnkfhodltrsewlhz`), com edge functions em `supabase/functions`.
- Empresa Castelo: `a0000000-0000-0000-0000-000000000001` (slug `castelo-da-diversao`).
- A IA de atendimento ("assistente", hoje chamada **Ana Castelo**) atende **só a unidade VENDAS 3** (instância `75feab3b-eb12-44f0-8ada-463e5540c869`). Já está liberada para os leads novos (não está mais em modo teste).
- O dono testa com o **número de teste** cadastrado em Configurar IA → Básico; ele sempre fala com a IA e aceita **`#reiniciar`** (nunca apagar a conversa na Central para testar).

## 2. Regras inegociáveis

1. **Chaves e senhas nunca no chat.** Token do Supabase só nos *GitHub Secrets*; chaves OpenAI/Anthropic só nos *secrets do Supabase*.
2. **O Claude só LÊ o banco** (workflow `db-read`). Qualquer escrita é um **SQL que o dono roda** em https://supabase.com/dashboard/project/rsezgnkfhodltrsewlhz/sql/new — sempre testado antes num Postgres local.
3. **A IA nunca cria, altera, cancela ou apaga** festas, pré-reservas, contratos, pagamentos ou dados financeiros (trava `guardAiDb` em `wapi-webhook/ai-db-guard.ts` + gatilho no banco). Tabela nova que a IA precise gravar tem de entrar na lista `AI_WRITABLE_TABLES`.
4. **Mega Magic e Planeta Divertido são intocáveis** (comportamento de follow-up/inatividade deles não muda).
5. **Não mexer no projeto de cupons da VPS** e **não reiniciar servidor** sem autorização.
6. **Alertas para o dono nunca saem do número de um buffet cliente.**
7. **Baterias do simulador de IA só por disparo manual.**
8. **Nada de nome de modelo de IA** em commits, PRs ou código.
9. **Nunca apagar dados** sem o dono aprovar; para tirar funcionalidade: primeiro esconder, depois remover.

## 3. Como trabalhar (passo a passo que funcionou)

- **Branch:** desenvolver no branch designado da sessão; publicar = PR → esperar checks → **OK do dono** → *squash merge* → esperar a Vercel → resetar o branch a partir da `main`.
  - **Merge e publicação de funções só com OK explícito do dono** ("pode fazer o merge", "pode publicar"). O sistema de permissões bloqueia merge sem revisão humana.
  - **Nunca mexer no cofre (Vault) do Supabase nem em chaves**, nem mesmo dentro de um SQL para o dono rodar. Isso é com o dono, pelo painel.
- **Publicar edge functions:** disparar o workflow `deploy-functions.yml`
  `gh api -X POST repos/centralplastcontato-cell/blank-canvas/actions/workflows/deploy-functions.yml/dispatches -f ref=main -f "inputs[functions]=wapi-webhook ai-simulator"` (funções separadas por espaço).
  - `wapi-webhook` = IA e WhatsApp (sempre junto com `ai-simulator`); `follow-up-check` = lembretes/jornada da IA e follow-ups.
- **Ler o banco:** editar `.github/db-read-request.json` (`{"sql": "SELECT ..."}`, um SELECT só, sem `;`), commit + push no branch, esperar o workflow `db-read.yml` e ler o log do job.
- **Ler logs das funções:** `.github/function-logs-request.json` + workflow `function-logs.yml` (a API de logs do Supabase às vezes responde "Backend error" — aí deduzir pelo banco e pelo código).
- **Checagens antes de publicar:** `npx tsc --noEmit -p tsconfig.app.json`, `npx vitest run`, testes Deno das funções e `deno check` (o `wapi-webhook` já tem 7 erros antigos de tipo — não aumentar).
  - A rede do ambiente bloqueia `deno.land` e `esm.sh`. Para rodar os testes Deno localmente, use um import map que troque `https://deno.land/std@0.208.0/assert/assert_equals.ts` por `jsr:@std/assert@1` (com `DENO_CERT=/root/.ccr/ca-bundle.crt npx deno test --no-check --import-map=...`).
  - Depois do teste, desfazer a alteração no `deno.lock`.
- **Consultas pesadas no db-read:** evitar `count`/subconsultas sobre `cron.job_run_details`, `wapi_webhook_raw_events` e `message_trace_logs` inteiras, porque a consulta trava. Para os crons, usar os últimos N `runid`.
- **Nunca mostrar chaves nem nomes de segredos no log** (o log do GitHub é visível). Para checar chaves, devolver só sim/não ou o papel (role) decodificado.

## 4. Estado atual da IA (VENDAS 3)

**Configuração (Configurar IA):** IA ligada desde 08/10/2026 14:44; "Só esse número fala com a IA" **desligado**; modelo GPT-5.4; alerta de passagem para o WhatsApp do dono em 10 min; follow-up/jornada **ligado**.

**Pendências do dono:**
- [ ] **Lembrete de inatividade ainda em 5 min / 2º em 30 min (valores de teste)** → trocar para 20–30 min e 2º em 3 h.
- [ ] Apagar das *informações do buffet* a linha antiga "SEU NOME: você se chama Bia…" (o nome configurado já vale mais, mas é bom limpar).

**O que a IA faz hoje (resumo):**
- 1ª mensagem com arte + apresentação ("Só aqui você vai encontrar 🥳" com linhas espaçadas) + pergunta do nome; depois a lista "como posso te ajudar" (🎈 orçamento / 🏰 já tenho festa / 💬 outro assunto).
- Coleta mês/data e convidados; manda fotos (legenda que encanta), vídeo e PDF; consulta preços na tabela oficial; consulta a agenda (só leitura); **marca visita** (com aviso no sininho + pop-up "IA · VISITA" + etiqueta ✨ IA na agenda); convite de visita sempre termina com pergunta.
- Menor pacote = 50 convidados (abaixo disso explica e a legenda do PDF diz "a partir de 50").
- Quem quer **trabalhar** recebe link curto do formulário de candidatura (`www.castelodadiversao.com.br/trabalhe/<código>`, já preenchido) e a IA continua respondendo esse candidato até a equipe escrever (7 dias).
- Passa para a equipe quando precisa (pop-up roxo da IA + alerta forte se ninguém responder).
- Jornada: lembrete de inatividade (1º e 2º, só 8h–22h; o que cair depois das 22h sai às 8h se a conversa parou há menos de 12h), follow-ups por etapa, lembretes antes da festa, perdido automático. O lembrete não pode repetir a pergunta anterior (trava `repeatsLastQuestion`).

**Custo:** desde 08/10/2026 o custo é registrado certo. Antes, o nome do modelo vinha com data (`gpt-5.4-2026-03-05`) e caía no preço do gpt-4o-mini, aparecendo cerca de 13 vezes menor. A 1ª conversa real custou ~US$ 0,06; a estimativa é de R$ 0,30 a R$ 0,70 por conversa. O que foi registrado antes da correção continua com o valor baixo.

**Telas novas recentes:** aba **Candidatos** (Formulários → Freelancer) com funil, nota, distância, aprovar com/sem mensagem, excluir; pop-up de **candidato novo**; **✨ roxo** nas conversas e nos leads atendidos pela IA (pontinho laranja = passou para a equipe) + filtros "IA" e "IA → equipe"; avisos (toast) somem em 3 s.

## 5. Ideias combinadas para depois (não fazer agora)

- **Assinatura da plataforma:** faixa de **~R$ 997/mês com IA** + franquia de conversas + taxa de implantação (R$ 1.500–3.000). Plano Essencial sem IA ~R$ 297–397. **Antes:** estabilizar, medir no Castelo (leads → visitas → festas fechadas) e fazer piloto com 3–5 buffets.
- **IA vendendo opcionais / upgrade de pacote:** só para quem já tem festa fechada, no momento certo (logo após fechar para upgrade; 45–30 dias antes para opcionais), uma oferta por vez, com prazo. A IA só apresenta e passa para a equipe fechar (ela não mexe em contrato/valor).

## 6. Limpeza da plataforma (feita em 08/10/2026) e o que ficou pendente

Método seguido: levantamento → uso real no banco → lista manter/consertar/simplificar/tirar → o dono decidiu → esconder primeiro, remover depois.

**Conclusão do levantamento:**
- A "Inteligência" quase não gasta IA: pontuação e temperatura são calculadas pelo banco (gatilhos), e Resumo do Dia, Resumo IA e Revisão mensal somam menos de US$ 0,05/mês.
- O gasto de IA que importa é a Ana Castelo.
- O peso estava no banco: 5 GB, quase 4 GB de registros técnicos sem limpeza.

**Publicado:**
- **Lote 1, segurança e bugs (PR #189 + SQL rodado pelo dono):**
  - 8 funções antigas e abertas viraram "desativada" (410): `rescue-orphan-leads`, `fix-exif-rotation`, `upload-carrossel-photos`, `migrate-aventura-images`, `migrate-castelo-materials`, `link-orphan-conversations`, `scd-discover`, `fix-text`.
  - `data-backup`: baixar ou gerar o backup de uma empresa exige login com acesso a ela.
  - Diagnóstico Msg dentro do Hub; rota `/admin/fix-prefesta` removida.
  - Custo da IA corrigido (seção 4); painel de alertas inteligentes escondido.
  - SQL `20261008230000_limpeza_logs_e_crons.sql`:
    - cron `cleanup-technical-logs` a cada 10 min, guardando 14 dias de `wapi_webhook_raw_events` e `message_trace_logs`;
    - cron `wapi-queue-processor-every-minute` desligado.
- **Lote 2, esconder o que estava parado (PR #191):**
  - Saíram da tela: menu Treinamento, balão do chat de suporte e Operações → Freelancer → Escalas.
  - Checklist de boas-vindas: tirado o passo do treinamento; links de "Convidar equipe" e "Preencher onboarding" consertados.
- **Lote 3, limpeza invisível (PR #192):**
  - Removidos: 7 páginas sem rota, 13 componentes sem uso, 65 imagens/vídeos sem uso e o `_shared/template-resolver.ts` duplicado.
  - Menu do Hub no celular igual ao do computador.

- **Nova Inteligência (09/10):**
  - **Passo 1 (#196):** escondidas as abas que não funcionavam; `lead-summary` e `monthly-review` passaram a exigir login.
  - **Passo 2 (#198 e #202):**
    - aviso "A visita aconteceu?" na Central de Atendimento;
    - aba Relatórios com as contas certas e a tabela por canal;
    - aba "Precisam de atenção".
  - **Passo 3 (#200):** aba "Por que não fechou" com IA, a função `weekly-insights` e o módulo "Inteligência com IA" (só no Castelo; o SQL foi rodado).
  - **Radar (#201):** escondido, porque travava com muitos leads.
- **Registros técnicos (conferido em 09/10):**
  - `wapi_webhook_raw_events` caiu de 835 mil para 103 mil linhas;
  - `message_trace_logs` caiu de 2,1 milhões para 1 milhão.
  - O banco segue em 5 GB porque o espaço só volta com `VACUUM FULL` (opcional, de madrugada, com o dono). Ele parou de crescer.

**Pendências do dono (conferidas em 09/10: ainda não feitas):**
- [ ] Rodar o SQL `20261009150000_desliga_revisao_mensal.sql`. Ele desliga o cron `monthly-review-generator`, que falharia todo dia 1º porque a função agora exige login.
- [ ] Inteligência → Motivos → **"Analisar agora"**: a primeira análise ainda não rodou. Depois de ver o resultado, aprovar o SQL do agendamento de segunda do `weekly-insights` (ainda não escrito).
- [ ] VENDAS 1 mostrava "Sessão incompleta" na Central: tocar em Reparar ou Reconectar.
- [ ] Hub → Empresas → Castelo → Módulos: desligar **Construtor de fluxos** (parado desde fev) e **Empresa Parceira**.
- [ ] Desativar **Espaço Carrossel** (não é mais cliente) e **INFESTA** (nunca foi) no Hub. **Hub Celebrei NÃO se apaga:** é o site central (conexão do WhatsApp, materiais).
- [ ] Ver se o número do Carrossel ainda é pago na W-API e se o domínio `www.espacocarrossel.online` ainda está na Vercel.
- [ ] Decidir o **item 11**: esconder ou manter Operações → Checklist (Equipe/Manutenção/Acompanhamento/Presença/Informações, sem uso desde fev/abr).
- [ ] (Opcional) **Cofre do Supabase:**
  - O segredo do cron de reforço dos webhooks foi criado com os campos trocados: a chave de serviço ficou no NOME, sem criptografia.
  - Por isso o cron `reinforce-webhooks-30min` provavelmente nunca autenticou.
  - O conserto é do dono, no painel (Vault). Também há 2 segredos-lixo ("SUA_CHAVE_AQUI", "SUA_SERVICE_ROLE_KEY_AQUI").

**Rodada final (a partir de ~15/10/2026, se nada reclamar e com o OK do dono no dia):**
Lista conferida em 09/10. Nada disso é usado por tela nenhuma nem por agendamento: o único agendamento é o `monthly-review-generator`, que o SQL acima desliga.

Apagar a pasta e a entrada no `config.toml` destas **12 funções**:
- as 8 desativadas: `rescue-orphan-leads`, `fix-exif-rotation`, `upload-carrossel-photos`, `migrate-aventura-images`, `migrate-castelo-materials`, `link-orphan-conversations`, `scd-discover`, `fix-text`;
- as das telas escondidas: `smart-alerts` (painel de alertas), `support-chat` (chat de suporte), `monthly-review` (revisão mensal) e `daily-summary` (Resumo do Dia).
- Para tirá-las do Supabase, criar um workflow `delete-functions.yml` (manual, com uma confirmação) que roda `supabase functions delete`. Hoje só existe o de publicar.
- **Manter:** `lead-summary`, que a ficha do lead no CRM usa (`LeadDetailSheet`). Os nomes em `HubAIUsage.tsx` são só rótulos do histórico de custo e podem ficar.

Apagar estes **24 arquivos de tela**, que ficaram sem uso:
- `src/components/admin/MonthlyReviewBanner.tsx`;
- `src/components/support/SupportChatbot.tsx`;
- em `src/components/inteligencia/`: `AlertsPanel`, `FollowUpLeadDetailSheet`, `FollowUpsTab`, `FunilTab`, `GuiaInteligenciaDialog`, `InlineAISummary`, `LeadsDoDiaTab`, `NegociacoesParadasTab`, `PrioridadesTab`, `ResponseTimeCard`, `ResumoDiarioTab`, `SalesPriorities`, `ScoreBadge`, `TemperatureBadge`;
- em `src/hooks/`: `useDailySummary`, `useLeadIntelligence`, `useLeadJourneyTimes`, `useLeadStageDurations`, `useMonthlyReview`, `useNegociacoesParadas`, `useResponseTime`, `useScoreSnapshots`.

Ainda com o dono:
- Com aprovação dele, apagar as empresas Carrossel e INFESTA. Elas só têm 3 leads antigos, 1 usuário cada e o número do Carrossel parado.
- Mais adiante (passo 4 da Inteligência): desligar os gatilhos da pontuação antiga (`recalculate_lead_score`, fotos de score, avisos de temperatura). Eles usam campos do robô antigo e só pesam no banco.
- Depois que o cofre estiver certo: fazer o cron `weekly-data-backup` usar a chave de serviço do cofre (hoje usa a chave pública) e fechar a geração de backup de "todas as empresas" só para essa chave.

**Achados para depois (não urgentes):**
- 7 funções não estão no `config.toml` e por isso publicam com `verify_jwt = true`: `campaign-mark-conversation`, `data-backup`, `pre-reservation-expiry`, `resolve-numeric-names-daily`, `resume-bot-qualification`, `start-bot-qualification`, `wapi-reinforce-webhooks`. Funciona porque os crons mandam a chave pública.
- Tabelas inchadas: `notifications` tem 411 MB para 58 mil linhas e `lead_history` tem 106 MB para 17 mil linhas. Um `VACUUM FULL` de madrugada recupera o espaço; é opcional e só com o dono.

## 7. Campanhas (reforma em 4 partes, 09/10/2026)

O dono aprovou as 4 partes. Todas foram publicadas e os SQLs foram rodados por ele e conferidos no banco.

**Regras de envio (decisão do dono, valem para todos os buffets):**
- Até **30 mensagens por dia** por empresa, somando todas as campanhas.
- Só de **segunda a sábado, das 9h às 19h** (horário de Brasília).
- Uma a cada 14 a 26 minutos, espalhadas ao longo do dia.

**Como funciona hoje:**
- **Envio pelo servidor:**
  - "Começar envio" grava a campanha com `status = sending`, `server_send = true`, o número (`send_instance_id`) e o modo (`send_mode`). A tela pode ser fechada.
  - O cron `campaign-dispatch-every-2min` (`*/2 12-21 * * 1-6`, UTC, espera de 60 s) chama a função `campaign-dispatch`.
  - Essa função não exige chave porque é idempotente: cada empresa manda no máximo 1 mensagem por chamada, e só quando `campaign_dispatch_state.next_send_at` chegou.
- **`campaign_dispatch_claim` (SQL, só a chave de serviço chama):**
  - separa a próxima pessoa com `FOR UPDATE SKIP LOCKED`;
  - pula telefone inválido, quem pediu para sair e telefone repetido na campanha;
  - conta o limite do dia e conclui a campanha quando não sobra ninguém;
  - quem ficou "enviando" por mais de 30 min vira erro "Envio não confirmado" e nunca é reenviado.
- **Quando algo dá errado:**
  - quarentena depois de reconectar: espera e tenta a mesma pessoa;
  - WhatsApp desconectado: tenta de novo em 30 min, com o aviso em `campaigns.last_error`;
  - 3 erros seguidos: pausa as campanhas da empresa.
- **Público:**
  - carrega todos os leads (em páginas);
  - esconde por padrão: fechado, perdido, transferido, fornecedor, trabalhe_conosco, outros e quem recebeu campanha nos últimos 15 dias;
  - sempre esconde quem pediu para sair e telefones repetidos (pelos 8 últimos dígitos).
- **Pediram para sair:**
  - o gatilho `trg_campaign_optout` em `wapi_messages` grava em `campaign_optouts` quando o cliente manda só "sair", "parar", "não quero mais" e parecidos;
  - só grava: não responde nada e não mexe no robô nem no follow-up;
  - a equipe vê e tira nomes da lista no botão "Pediram para sair".
- **Resultado:** `campaign_results(company_id)` conta quem respondeu em até 3 dias e quem fechou festa em até 45 dias, pelo telefone.
- **Arte "Com Foto":** não usa mais IA. A foto do buffet abre direto no editor de texto, já com o logo na posição escolhida. Antes a IA ignorava a foto e o logo nunca era colocado.

**Para conferir no banco (db-read):**
- `campaign_dispatch_state`: próxima mensagem de cada empresa.
- `campaigns.last_error`: por que o envio parou.
- `net._http_response`: respostas da função. `{"ok":true,"results":[...]}` é o normal.

**Números em 09/10 (antes da reforma):**
- Castelo: ~860 mensagens, ~85 respostas, 0 festas.
- Mega Magic: ~350 mensagens, ~40 respostas, 0 festas.
- Planeta: ~115 mensagens, 12 respostas, 4 festas.
- ~27 pessoas receberam a mesma campanha 2 vezes; já corrigido.

**Para a rodada final da limpeza (com OK do dono):**
- `src/contexts/CampaignSenderContext.tsx`: o envio antigo pelo navegador. Ninguém inicia envio por ele. Tirar o provider do `App.tsx` e o uso em `Campanhas.tsx`.
- `campaign-image`: o modo `photo` não é mais chamado pela tela, que só usa `theme_only`.

## 8. Central de Agenda (reforma em partes, a partir de 09/10/2026)

O dono aprovou: parte 1 (financeiro e erros graves), parte 2 (números certos), parte 3 ("o que falta resolver"), parte 4 (visual no celular), esconder os modelos de tarefa e mandar a confirmação só para visitas. As pré-reservas ficam como estão.

**Parte 1, o que mudou:**
- **Salvar festa:**
  - só refaz as parcelas se o plano de pagamento mudou;
  - nunca refaz quando há recebimento parcial lançado (`event_payment_entries` some junto com a parcela, em cascata);
  - não troca mais o `created_by` na edição;
  - o valor do pacote com desconto % sobre o total não encolhe mais a cada salvamento.
- **Aba Financeiro da festa:** só grava ao abrir para quem pode editar o financeiro. Nunca apaga parcela paga ou com recebimento parcial.
- **Excluir festa:**
  - o financeiro sai junto com a festa num comando só, em cascata, então se a exclusão falhar nada se perde;
  - contrato ou formulário que trave a exclusão é apagado um por vez (lista em `src/lib/eventDelete.ts`).
- **Valores da festa:** aparecem só com a permissão `agenda.faturamento` (ou admin), na lista, em Fechadas e no detalhe.
- **Pré-reserva:**
  - vira "convertida" só depois que a festa é salva, com `converted_event_id`. Antes o comando nem chegava ao banco;
  - o aviso de vencimento (`pre-reservation-expiry`) agora sai de verdade, no formato do wapi-send. Só o Castelo tem essa automação ligada.
- **Confirmação de visita:**
  - não vai mais para atendimento;
  - envio pulado pelo wapi-send (quarentena) fica como `skipped` e não como enviado;
  - a confirmação manual conta como a primeira;
  - não confirma visita que já começou.
- **Visitas:** "Fechou na Visita" pede confirmação e acrescenta a anotação, sem apagar as observações do lead.
- **Tarefas:**
  - a que vence hoje não aparece mais como atrasada;
  - "Ver atrasadas" mostra só as atrasadas;
  - modelos de tarefa por festa escondidos, porque nunca criaram tarefas.
- **Aba Geral:** a festa aberta por ela tem contrato, WhatsApp, editar e excluir funcionando.

**Funções publicadas (09/10):** `visit-confirmation` e `pre-reservation-expiry`.

**Parte 2 (números do topo):** as contas ficam em `src/lib/agendaKpis.ts`.
- **Fechadas e faturamento fechado:**
  - festa cancelada não conta e aparece como "+N cancelada";
  - permuta conta como venda, mas sem faturamento.
- **Líquido:** usa a taxa de cartão gravada na festa (`saldo_taxa_percent` / `entrada_taxa_percent`); sem ela, a operadora da festa; sem ela, a primeira operadora da empresa.
- **Faturamento agendado:** festas confirmadas do mês (bruto, sem permuta), com uma linha "+ R$ X em festas pendentes".
- **Ocupação:** com "Todas as unidades", mostra também a de cada unidade.
- **Período:** as vendas do mês e as do período ficam separadas. Trocar o mês ou a unidade não estraga mais o período, e limpar volta para o mês.
- **Atalhos de período:** "Semestre atual" vai de janeiro a junho ou de julho a dezembro (`src/lib/periodPresets.ts`).

**Parte 3 ("o que falta resolver"):**
- **Festas → "O que falta resolver"** (`UpcomingIssuesCard`, regras em `src/lib/agendaIssues.ts`):
  - olha as próximas festas dos 60 dias seguintes;
  - mostra parcela vencida (o recebido não cobre), ainda pendente, sem valor (permuta não conta), sem horário e sem unidade;
  - contrato assinado ficou de fora, porque quase ninguém marca a assinatura no sistema;
  - tocar abre a festa;
  - a lista confere de novo ao fechar a festa.
- **Visitas → "Visitas sem resultado"** (`PendingVisitOutcomesCard`):
  - visitas que já passaram, sem atendimento;
  - botões Veio, Não veio, Remarcou (abre a visita com a remarcação) e Cancelou.
- **Aviso "a visita aconteceu?" da Central:**
  - não pergunta mais de atendimento;
  - "Remarcou" abre a visita certa (`/agenda?tab=visitas&visita=<id>`).
- **Aba Visitas:** recarregar não troca mais a tela por "carregando", então a visita aberta não fecha sozinha.

**Parte 4 (visual no celular):**
- **Topo fixo:** ficou só com o menu e as 4 abas, que cabem inteiras na largura. Sub-abas, botões, unidade e busca rolam com a página.
- **Calendário:** ao tocar numa data, a tela rola até as festas do dia; os textos dentro do dia foram aumentados.
- **Botões:**
  - os de contrato no detalhe da festa ficaram maiores;
  - o rodapé do formulário de festa fica numa linha só, sem corte.
- **Tarefas:** editar e excluir sempre à vista (no toque não existe "passar o mouse").
- **Visitas:** filtros 2 por linha; os números têm o mesmo visual dos da aba Festas.

**Números em 09/10:**
- 404 festas passadas ainda como confirmado/pendente (ninguém marca "realizada").
- 233 visitas passadas sem resultado.
- 82 festas sem unidade, 42 sem valor, 33 sem horário.
- Pré-reservas: 15 no total, nenhuma virou festa.

**Aba Visitas (10/10, mesma linha da aba Festas):**
- **Topo:**
  - "Todas | Visitas | Atendimentos" como sub-abas discretas;
  - situação, unidade e responsável num botão "Filtros", com a contagem dos filtros ativos;
  - no celular, Nova visita e Atendimento ficam no botão + flutuante.
- **Números** (`src/lib/visitKpis.ts`): Visitas no mês, A acontecer, Vieram e Não vieram, mais o "Comparecimento do mês", que entrou no lugar da ocupação (vieram ÷ visitas com resultado).
- **Calendário:** mesmos tamanhos do de Festas; tocar na data rola até as visitas do dia; trocar de mês não pisca.
- **Correções:**
  - o filtro "Responsável" só mostra quem é da empresa (via `user_companies`);
  - a aba respeita a unidade permitida, e visita sem unidade continua aparecendo;
  - visita marcada pela ficha do lead leva a unidade do lead;
  - o aviso "sem confirmação" busca hoje e amanhã à parte e inclui as remarcadas;
  - cancelar visita pede confirmação.

**Abas Tarefas e Geral (10/10):**
- **Uso real:** Tarefas quase não é usada.
  - Planeta: 5 tarefas mensais, paradas desde junho (17 atrasadas acumuladas pelo robô).
  - Mega: 4 tarefas; Castelo: 2, todas de maio. Aventura: nenhuma.
- **Tarefas que se repetem** (`src/lib/taskOccurrences.ts`, com testes):
  - a tarefa "modelo" (`is_recurring`, sem `parent_task_id`) é a 1ª vez;
  - o cron `generate-recurring-tasks-daily` (6h UTC) cria cada repetição 7 dias antes, com `parent_task_id`;
  - o modelo some da lista quando já existe a repetição do mesmo dia;
  - card "Tarefas que se repetem" com **Parar de repetir**: põe `recurrence_end_date` = hoje e apaga as próximas repetições pendentes (data depois de hoje);
  - "a cada 2 semanas/meses" nunca funcionou no robô: o campo saiu e vai sempre 1; semanal exige os dias, e repetir exige a data da 1ª vez;
  - tarefa criada dentro da festa e repetição criada pelo robô não mostram a opção de repetir.
- **Responsável:**
  - campo no formulário (pessoas da empresa, `useCompanyPeople`), nome no cartão e no detalhe, filtro "Pessoas / Minhas tarefas / Sem responsável";
  - o ranking do painel de produtividade usa o nome (antes mostrava "Sem responsável").
- **Avisos:**
  - "⏰ Tarefa vence amanhã" (`task-notifications`, cron 8h UTC) vai só para o responsável ou, sem ele, para quem criou (`_shared/task-reminders.ts`). Antes ia para a empresa toda: 114 avisos, 6 abertos;
  - "📋 Tarefa atribuída a você": o gatilho comparava texto com uuid e dava erro ao trocar o responsável. O SQL `20261010130000_tarefas_responsavel.sql` corrige e passa a avisar também na criação. **O dono roda esse SQL antes de publicar a tela;**
  - tocar no aviso de tarefa no sino abre a aba Tarefas.
- **Geral:**
  - números no estilo de Festas e Visitas (canceladas fora da conta);
  - tarefas sem duplicata, e as próximas repetições aparecem como "Prevista";
  - respeita a unidade da pessoa: festas com a regra de Festas, visitas com a de Visitas (`src/lib/unitAccess.ts`);
  - cada item mostra a situação; tocar na visita abre a aba Visitas (`?tab=visitas&visita=<id>`; `&remarcar=1` já abre a remarcação);
  - "Editar" da tarefa funciona e excluir pede confirmação;
  - trocar de mês não pisca, e no celular tocar na data rola até a lista (vale também tocar de novo no dia já escolhido, em todas as abas).
- **Rodada final da limpeza:** `src/components/agenda/VisitDetailSheet.tsx` ficou sem uso.

## 9. Central de Atendimento (reforma em 4 partes, a partir de 10/10/2026)

O dono aprovou as 4 partes: 1 erros graves, 2 permissões e unidades, 3 aba Leads, 4 velocidade e celular. Robô, IA, follow-up e inatividade **não mudam** (Mega e Planeta intocáveis).

**Uso em 10/10:**
- Conversas ativas no mês: Castelo 992, Mega 353, Planeta 282 (Aventura não usa o chat).
- Mensagens na semana: Castelo 4.351, Planeta 1.481, Mega 1.348.
- Responsável do lead quase ninguém usa (Castelo 3.755 de 4.042 sem; os outros 100% sem).
- Mudança de status é quase toda automática (robô).
- "Não lidas": Planeta 1.131 (801 com a última mensagem da equipe), Mega 504 (399).

**Parte 1, o que mudou:**
- **Salvar festa** fica em `src/lib/eventSave.ts`, com a mesma regra para Agenda, Central, ficha do lead e card do lead no chat:
  - `buildEventPayload`, `eventRowToFormData`, `syncEventPayments` (parcelas, movida da Agenda sem mudar a regra) e `saveEvent`;
  - antes, fora da Agenda a festa saía sem criança, pais, opcionais e parcelas. Nos últimos 90 dias, Mega teve 12 de 25 festas sem parcelas e Planeta 19 de 36;
  - editar pelo card do chat somava os opcionais em dobro no valor.
- **Excluir lead** (`src/lib/leadDelete.ts`):
  - confere quantos o banco apagou, porque só dono/admin pode e para os outros o banco não apaga nem dá erro;
  - o histórico sai em cascata (não se apaga antes);
  - pelo chat, o lead é excluído antes da conversa; sem permissão, nada é apagado.
- **Chat:**
  - "Arquivo de Áudio" agora envia (`send-audio`);
  - imagem, vídeo e documento recusados ou em pausa não aparecem como "enviado";
  - o reenvio automático só acontece em falha de rede (antes podia mandar duas vezes);
  - "Compartilhar no grupo" manda `action: send-text` com o grupo em `phone`;
  - abrir conversa com número novo seleciona a conversa criada;
  - trocar de conversa no meio de uma ação não traz a anterior de volta nem mostra o lead errado;
  - "Hoje/Ontem" usa o dia local;
  - o histórico do lead criado pelo "Novo contato" grava nas colunas certas, e a troca de status pelo topo grava `company_id`.
- **Não lidas** (`src/lib/conversationUnread.ts`):
  - conta só quando o cliente mandou a última mensagem, ou quando a IA passou para a equipe (99);
  - vale para a lista, o filtro, o número da Central e o menu;
  - a conversa aberta na tela não acumula não lidas.

**Parte 2, o que mudou:**
- **Permissões de lead numa regra só** (`src/lib/leadPermissions.ts` + `useLeadPermissions`), usada na Central e no chat:
  - sem registro de permissão continua liberado (regra de sempre);
  - enquanto as permissões carregam, nada fica liberado (antes ficava tudo);
  - o papel "Visualização" não edita nem exclui.
- **Chat:**
  - a ficha do lead aberta pelo chat respeita "editar" e "ver contato" (antes era sempre liberada);
  - o card do lead esconde o lápis de nome, telefone e observações sem permissão, e mostra o telefone com **** sem "ver contato";
  - anexo e contato exigem "enviar mensagem", como o texto.
- **Unidades:**
  - número de leads novos (agora só da empresa atual), não lidas (só dos números das unidades da pessoa), som de lead novo e lead que chega na hora respeitam a unidade;
  - o link `?lead=` abre mesmo com a lista vazia, só da empresa atual e com aviso se o lead for de outra unidade;
  - o aviso "A visita aconteceu?" só pergunta das unidades da pessoa;
  - os avisos de cliente, visita e dúvidas mostram o telefone com **** sem "ver contato".
- **Histórico** (SQL `20261010140000_historico_lead_empresa.sql`, testado no Postgres local):
  - gatilho preenche a empresa do lead quando o registro chega sem ela; os 1.485 antigos recebem a empresa;
  - a regra de apagar fica só da própria empresa;
  - antes, as automações (reativação, confirmação de visita) gravavam sem empresa e não apareciam no histórico, e o quadro de colunas nem conseguia gravar;
  - o robô de follow-up lê o histórico pelo lead, sem filtrar empresa, então nada muda no comportamento dele.
- **Fica para depois:** travar a unidade também no banco (hoje só na tela).

**Parte 3 (aba Leads), o que mudou:**
- **Filtros numa regra só** (`src/lib/leadQuery.ts`), usada na lista, no quadro (CRM), nos números do topo e no Exportar:
  - a busca aceita vírgula, parênteses e aspas, e telefone com máscara acha o número ("(11) 98765-4321");
  - "Visitas agendadas" filtra no banco (antes só filtrava os 20 da página, e o total ficava errado);
  - a busca espera parar de digitar (0,4 s);
  - o filtro de campanhas e meses lê todos os leads (antes só os 1.000 primeiros, e no Castelo, com 4.042, sumiam campanhas). Os meses aparecem na ordem do calendário.
- **Quadro (CRM)** (`src/lib/leadKanban.ts`):
  - cada coluna busca os 50 mais recentes (Fechado busca 500), e o número no topo é o total real com os filtros. Antes eram só 20 leads espalhados pelas 11 colunas;
  - nova coluna "Outros" (o Planeta tem 39 leads nela, que não apareciam);
  - as setas andam dentro do funil e param em "Fechado" (antes a seta de Fechado levava para "Perdido"). As outras colunas andam só entre elas;
  - soltar o cartão na mesma coluna não faz nada;
  - a coluna "Realizada" segue com o histórico todo (sem o período da tela, como antes) e respeita os outros filtros. Festa cancelada não conta.
- **Mudar situação** é a mesma regra na lista, no quadro e nos cartões do celular:
  - grava o histórico com o nome da situação;
  - "Perdido" desliga o robô da conversa (o quadro e o chat já faziam);
  - "Fechado" abre o cadastro da festa.
- **Números do topo:**
  - usam os mesmos filtros da lista;
  - se atualizam quando muda situação, quando um lead é excluído e quando chega ou muda lead (no máximo a cada 10 s);
  - o cartão "Em Contato" virou "Visita", como a coluna.
- **Exportar:**
  - leva todos os leads do filtro, de 1.000 em 1.000, até 20.000 (antes só os 20 da página);
  - mostra o nome da campanha;
  - aspas e quebras de linha não quebram a planilha;
  - texto começado por = + - @ ganha um ' na frente, para o Excel não rodar como fórmula.

**Parte 4 (velocidade e celular), o que mudou:**
- **O chat não recarrega à toa:**
  - trocar entre Chat e Leads mantém o chat carregado (`forceMount`). Antes, cada troca buscava todas as conversas de novo (no Castelo, umas 5.000);
  - a conferência de conexão do número não apaga mais a lista. O chat só recarrega quando muda o número escolhido (`selectedUnitInstanceIds` pelos ids, não pelo status);
  - na aba Leads o chat fica escondido e **não marca como lida** a conversa aberta (`isVisible`). Ao voltar para Chat, conta como lida e a conversa volta para onde estava.
- **Toque (celular e tablet):**
  - segurar o dedo na mensagem abre o menu também no celular (o #239/#240 tinha ligado só no layout de tablet);
  - a setinha do menu da mensagem, o "⋮" de situação do lead, o "salvar imagem" e os lápis do quadro ficam à vista em tela de toque (`[@media(hover:none)]`);
  - no tablet, um menu "⋯" em cada conversa da lista reúne encerrar, visita, freelancer, equipe e favorito (antes só apareciam com o mouse). No computador nada muda.
- **Celular:**
  - "Busca e Filtros" mostra os filtros num toque só (antes eram dois), com a barra maior e o aviso "filtro ativo" quando ela está fechada;
  - os botões do topo da conversa passaram de 28–32 px para 36 px;
  - o telefone no topo não passa mais por baixo dos ícones.

**Visual no celular (pedido do dono, 10/10, a partir das fotos do iPhone):**
- **Conversa aberta usa a tela toda:**
  - o topo do app, os avisos e as abas Chat/Leads somem enquanto a conversa está aberta e voltam ao sair dela (`onConversationOpenChange` → `phoneConversationOpen`);
  - o topo da conversa virou uma linha só: as ações da antiga 2ª linha (orçamento, visita, freelancer, equipe, favorito, buscar, selecionar imagens) estão no "⋮", com nome;
  - o que está marcado aparece como ícone na barra de Status;
  - tocar no nome abre "Dados do contato".
- **Campo de digitar:**
  - escreve "Mensagem";
  - enquanto se digita, somem modelos e materiais e o botão vira "enviar" (sem texto, é o microfone);
  - a caixa cresce com o texto.
- **Ficha do lead (botão "i"):** no celular abre de baixo para cima (Sheet) e fecha sozinha ao abrir visita, transferir, excluir, grupo ou festa. No computador continua a caixinha.
- **Dados do contato:** fica um X só para fechar.
- **Telefone:** aparece como "(15) 99113-1863" no topo da conversa, em "Dados do contato", na ficha e na lista (`formatPhoneBR` em `src/lib/mask-utils.ts`).
- **Lista:**
  - a etiqueta da unidade só aparece quando a conversa é de outra unidade;
  - o "99+" fica ao lado de "Chat"/"Leads", sem cobrir a palavra;
  - no celular a setinha das mensagens fica invisível (segurar o dedo abre o menu).
