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
