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

- **Branch:** desenvolver no branch designado da sessão; publicar = PR → esperar checks → *squash merge* → esperar a Vercel → resetar o branch a partir da `main`.
- **Publicar edge functions:** disparar o workflow `deploy-functions.yml`
  `gh api -X POST repos/centralplastcontato-cell/blank-canvas/actions/workflows/deploy-functions.yml/dispatches -f ref=main -f "inputs[functions]=wapi-webhook ai-simulator"` (funções separadas por espaço).
  - `wapi-webhook` = IA e WhatsApp (sempre junto com `ai-simulator`); `follow-up-check` = lembretes/jornada da IA e follow-ups.
- **Ler o banco:** editar `.github/db-read-request.json` (`{"sql": "SELECT ..."}`, um SELECT só, sem `;`), commit + push no branch, esperar o workflow `db-read.yml` e ler o log do job.
- **Ler logs das funções:** `.github/function-logs-request.json` + workflow `function-logs.yml` (a API de logs do Supabase às vezes responde "Backend error" — aí deduzir pelo banco e pelo código).
- **Checagens antes de publicar:** `npx tsc --noEmit -p tsconfig.app.json`, `npx vitest run`, testes Deno das funções e `deno check` (o `wapi-webhook` já tem 7 erros antigos de tipo — não aumentar).

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

**Telas novas recentes:** aba **Candidatos** (Formulários → Freelancer) com funil, nota, distância, aprovar com/sem mensagem, excluir; pop-up de **candidato novo**; **✨ roxo** nas conversas e nos leads atendidos pela IA (pontinho laranja = passou para a equipe) + filtros "IA" e "IA → equipe"; avisos (toast) somem em 3 s.

## 5. Ideias combinadas para depois (não fazer agora)

- **Assinatura da plataforma:** faixa de **~R$ 997/mês com IA** + franquia de conversas + taxa de implantação (R$ 1.500–3.000). Plano Essencial sem IA ~R$ 297–397. **Antes:** estabilizar, medir no Castelo (leads → visitas → festas fechadas) e fazer piloto com 3–5 buffets.
- **IA vendendo opcionais / upgrade de pacote:** só para quem já tem festa fechada, no momento certo (logo após fechar para upgrade; 45–30 dias antes para opcionais), uma oferta por vez, com prazo. A IA só apresenta e passa para a equipe fechar (ela não mexe em contrato/valor).

## 6. Missão do novo chat: limpeza e ajustes da plataforma

Objetivo: tirar o que é inútil, consertar bugs e reduzir gasto (inclusive rotinas da "Inteligência" que consomem IA sem servir para nada).

Método combinado:
1. **Levantamento:** listar telas/abas, edge functions e rotinas automáticas (crons), incluindo o que gasta IA.
2. **Uso real:** consultar o banco (db-read) para ver o que é usado de verdade e o que está parado; estimar custo de cada rotina.
3. **Classificar** cada item em manter / consertar / simplificar / tirar — e mostrar a lista para o dono decidir.
4. **Tirar com segurança:** esconder primeiro, remover depois; nunca apagar dados sem aprovação; respeitar as regras da seção 2.
