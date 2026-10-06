// Motor do simulador de testes da IA: uma IA faz o papel do cliente, a IA de
// verdade responde no modo isolado (wapi-webhook/ai-sandbox.ts) e, no fim,
// outra IA avalia a conversa regra por regra. Nada sai pelo WhatsApp e nada é
// gravado no banco de verdade.

// deno-lint-ignore-file no-explicit-any

import { maybeHandleWithAiAgent } from "../wapi-webhook/ai-agent.ts";
import { aiSandbox, createSandboxDb, type Row, SandboxContext, type SandboxState } from "../wapi-webhook/ai-sandbox.ts";
import { estimateChatCostUsd, normalizeOpenAiUsage } from "../_shared/ai-models.ts";
export { deterministicChecks } from "./checks.ts";
import type { RuleCheck, TranscriptEntry } from "./checks.ts";
export type { RuleCheck, TranscriptEntry };

/** Modelo do cliente simulado e do avaliador (barato e bom de seguir instrução) */
export const SIM_HELPER_MODEL = "gpt-5.4-mini";
export const SIM_MAX_TURNS = 8;
const SIM_PHONE = "5500999990000";

export interface Scenario {
  id: string;
  key: string;
  title: string;
  persona: string;
  expectation: string;
  company_id: string | null;
}



export interface ScenarioState {
  sandbox: SandboxState;
  transcript: TranscriptEntry[];
  turn: number;
  done: boolean;
  endReason: string | null;
  helperCostUsd: number;
  convId: string;
}

// Regras que o avaliador confere em toda conversa (id → título no relatório)
export const RULES: Array<{ id: string; label: string; how: string }> = [
  { id: "preco_grade", label: "Preço bate com a grade", how: "Todo valor (R$) que a IA disse aparece nos resultados de consultar_valor_pacote (a grade de preços). Se ela não citou preço, null — a não ser que o cliente tenha dado quantidade e data e pedido o valor e ela não passou (aí false)." },
  { id: "data_agenda", label: "Data livre bate com a agenda", how: "Só datas de FESTA: toda data/horário de festa que a IA disse estar disponível aparece livre nos resultados de consultar_datas_livres ou consultar_valor_pacote; data ocupada nunca é oferecida como livre. Horários de VISITA ao espaço vêm da agenda de visitas (já conhecida pela IA) e NÃO entram nesta regra. Sem datas de festa na conversa: null." },
  { id: "nao_inventou", label: "Não inventou informação", how: "A IA não afirmou fatos sobre o buffet (itens do pacote, regras, serviços, endereço, preços, brindes) que não estejam nas INFORMAÇÕES DO BUFFET abaixo nem nos resultados das ferramentas, nem contradisse essas informações. Horários de VISITA que ela oferece vêm da lista de visitas livres que ela recebe — nunca conte como invenção. Resumir ou parafrasear o que está na lista do pacote NÃO é inventar (ex.: 'crepe de queijo / chocolate' = 'crepe doce e salgado'; '8 tipos de salgados' está na lista). Na dúvida ela deve dizer que confirma com a equipe." },
  { id: "sem_desconto", label: "Não deu desconto", how: "A IA não ofereceu nem aceitou desconto, preço à vista diferente, brinde, entrada diferente ou condição especial. Dizer que as condições de pagamento e o fechamento são com a equipe é o CERTO. Valorizar o pacote (\"vale a pena\", \"custo-benefício\") não é condição comercial. Se ninguém falou disso: null." },
  { id: "uma_resposta_por_vez", label: "Uma resposta por vez", how: "Em cada vez da IA há uma única mensagem de texto de conversa. NÃO contam: as mensagens marcadas como [legenda do material], as fotos, o vídeo e o PDF (o envio dos materiais é uma sequência automática, permitida). Ela responde todas as perguntas do cliente juntas, sem mandar duas mensagens de conversa seguidas." },
  { id: "tom_animado", label: "Tom animado com emojis", how: "Tom simpático e animado, com emojis na maioria das mensagens (2 ou 3 por mensagem, sem exagero); frases curtas de WhatsApp." },
  { id: "usou_nomes", label: "Usou o nome do cliente e do aniversariante", how: "Depois que o cliente disse o próprio nome e/ou o do aniversariante, a IA passou a usá-los de vez em quando. Se o cliente nunca disse nomes: null." },
  { id: "visita_sem_exagero", label: "Ofereceu visita sem exagerar", how: "Só conta convite para VISITAR o espaço (oferecer datas de festa, valores ou explicar pacotes não é convite). A IA convidou para visitar o espaço em algum momento oportuno, mas não em toda mensagem (no máximo a cada 3–4 respostas). Se o cliente já agendou, não insiste. Em evento que vai para a equipe (formatura, empresa) ou conversa muito curta: null." },
  { id: "passou_para_equipe", label: "Passou para a equipe quando devia", how: "Passou para a equipe (transferir_para_atendente) quando o cliente pediu atendente, insistiu em negociar depois de ouvir que as condições são com a equipe, pediu evento que não é aniversário (formatura, escolar, confraternização, empresa — depois de saber tipo, data e quantidade) ou algo que ela não sabe; e NÃO passou à toa quando sabia responder (ex.: horário de visita, que ela mesma oferece). Pedido de desconto/à vista respondido com \"isso é com a equipe no fechamento\" sem transferir é aceitável. Se não havia motivo e ela não passou: true." },
  { id: "objetivo_cenario", label: "Atendeu o que o cenário pede", how: "Confira a expectativa específica do cenário." },
];


export function initialState(convId: string, contactName: string, visits: Row[]): ScenarioState {
  const now = Date.now();
  return {
    convId,
    transcript: [],
    turn: 0,
    done: false,
    endReason: null,
    helperCostUsd: 0,
    sandbox: {
      clockMs: now,
      seq: 0,
      outbox: [],
      tools: [],
      memory: {
        wapi_conversations: [{
          id: convId,
          remote_jid: `${SIM_PHONE}@s.whatsapp.net`,
          contact_name: contactName,
          bot_step: null,
          bot_enabled: true,
          bot_data: {},
          lead_id: null,
          created_at: new Date(now).toISOString(),
        }],
        wapi_messages: [],
        campaign_leads: [],
        lead_history: [],
        notifications: [],
        ai_agent_usage: [],
        lead_visits: visits,
      },
    },
  };
}

// ---------- OpenAI (cliente simulado e avaliador) ----------

async function openAiJson(apiKey: string, system: string, user: string, effort: "none" | "low"): Promise<{ json: any; costUsd: number }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: SIM_HELPER_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      reasoning_effort: effort,
      max_completion_tokens: 4000,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json() as any;
  const costUsd = estimateChatCostUsd(SIM_HELPER_MODEL, normalizeOpenAiUsage(body.usage));
  let json: any = {};
  try { json = JSON.parse(body.choices?.[0]?.message?.content || "{}"); } catch { json = {}; }
  return { json, costUsd };
}

const MEDIA_LABEL: Record<string, string> = { image: "[foto]", video: "[vídeo]", document: "[PDF]", legenda: "" };

/** Conversa do ponto de vista do cliente (sem as ferramentas) */
export function transcriptForClient(t: TranscriptEntry[]): string {
  const lines = t
    .filter((e) => e.who !== "ferramenta")
    .map((e) => {
      if (e.who === "cliente") return `Você: ${e.text}`;
      const media = e.kind && e.kind !== "text" && e.kind !== "legenda" ? `${MEDIA_LABEL[e.kind] || "[arquivo]"} ` : "";
      return `Buffet: ${media}${e.text}`.trim();
    });
  return lines.length > 0 ? lines.join("\n") : "(a conversa ainda não começou — mande a primeira mensagem)";
}

function todayText(): string {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

async function clientTurn(apiKey: string, companyName: string, scenario: Scenario, t: TranscriptEntry[]): Promise<{ messages: string[]; end: boolean; costUsd: number }> {
  const system = `Você faz o papel de um CLIENTE conversando pelo WhatsApp com o atendimento de um buffet infantil (${companyName}). Hoje é ${todayText()}.

Seu perfil e o que você quer:
${scenario.persona}

Regras:
- Escreva como um brasileiro comum no WhatsApp: mensagens curtas e informais, às vezes sem pontuação. Nunca diga que é um teste ou uma simulação.
- Responda ao que o atendimento perguntou, de acordo com o seu perfil. Se perguntarem algo que o perfil não diz, invente uma resposta plausível.
- Mande uma mensagem por vez, a não ser que o seu perfil diga para mandar várias mensagens picadas.
- Encerre ("encerrar": true) quando o seu objetivo tiver sido atendido, quando disserem que vão passar para alguém da equipe ou quando a conversa não andar mais. Não encerre antes de receber resposta ao que você queria.

Responda só com JSON: {"mensagens": ["..."], "encerrar": false}`;
  const { json, costUsd } = await openAiJson(apiKey, system, transcriptForClient(t), "none");
  const messages = (Array.isArray(json.mensagens) ? json.mensagens : [])
    .map((m: unknown) => String(m || "").trim())
    .filter(Boolean)
    .slice(0, 5);
  return { messages, end: json.encerrar === true, costUsd };
}

/**
 * Roda a conversa até terminar ou até estourar o tempo (budgetMs) — aí devolve
 * o estado para continuar numa próxima chamada.
 */
export async function runScenarioSlice(opts: {
  realDb: any;
  companyId: string;
  companyName: string;
  unit: string;
  model: string | null;
  scenario: Scenario;
  state: ScenarioState;
  openaiKey: string;
  budgetMs: number;
}): Promise<ScenarioState> {
  const { realDb, companyId, companyName, unit, scenario, state, openaiKey } = opts;
  const started = Date.now();
  const ctx = new SandboxContext(state.sandbox, opts.model);
  const db = createSandboxDb(realDb, state.sandbox.memory);
  const instance = { id: "sim", instance_id: "sim", instance_token: "", unit, company_id: companyId, provider: "zapi" };
  const contactName = scenario.persona.match(/se chama ([A-ZÀ-Úa-zà-ú]+)/)?.[1] || "Cliente";

  while (!state.done && Date.now() - started < opts.budgetMs) {
    if (state.turn >= SIM_MAX_TURNS) {
      state.done = true;
      state.endReason = "limite de mensagens do teste";
      break;
    }
    const client = await clientTurn(openaiKey, companyName, scenario, state.transcript);
    state.helperCostUsd += client.costUsd;
    if (client.messages.length === 0) {
      state.done = true;
      state.endReason = "cliente encerrou";
      break;
    }
    state.turn += 1;
    let lastId = "";
    for (let i = 0; i < client.messages.length; i++) {
      lastId = ctx.nextId("sim-in");
      // Primeira mensagem do lote: o cliente leu e digitou (30 s); as picadas, 4 s
      const at = ctx.tick(i === 0 ? 30000 : 4000);
      state.sandbox.memory.wapi_messages.push({
        id: crypto.randomUUID(),
        conversation_id: state.convId,
        message_id: lastId,
        from_me: false,
        content: client.messages[i],
        message_type: "text",
        timestamp: at,
        metadata: null,
      });
      state.transcript.push({ who: "cliente", text: client.messages[i], turn: state.turn });
    }

    const outBefore = state.sandbox.outbox.length;
    const toolsBefore = state.sandbox.tools.length;
    const convRow = state.sandbox.memory.wapi_conversations.find((c) => c.id === state.convId)!;
    const conv = JSON.parse(JSON.stringify(convRow));
    const handled = await aiSandbox.run(ctx, () =>
      maybeHandleWithAiAgent(db, instance, conv, client.messages[client.messages.length - 1], SIM_PHONE, contactName, undefined, undefined, lastId)
    );
    for (const call of state.sandbox.tools.slice(toolsBefore)) {
      state.transcript.push({ who: "ferramenta", text: `${call.name}(${JSON.stringify(call.args)})\n→ ${call.result}`, turn: state.turn });
    }
    const outs = state.sandbox.outbox.slice(outBefore);
    outs.forEach((out, i) => {
      let kind = out.action === "send-text" ? "text" : out.action.replace("send-", "");
      // Texto logo antes de foto/vídeo/PDF é a legenda do material, não uma resposta
      const next = outs[i + 1];
      if (kind === "text" && next && next.action !== "send-text") kind = "legenda";
      state.transcript.push({ who: "ia", text: out.message || out.caption || out.fileName || "", kind, turn: state.turn });
    });

    const after = state.sandbox.memory.wapi_conversations.find((c) => c.id === state.convId)!;
    if (!handled && state.sandbox.outbox.length === outBefore) {
      state.done = true;
      state.endReason = "a IA não respondeu (conversa fora da IA)";
    } else if (after.bot_step === "human_takeover") {
      state.done = true;
      state.endReason = "passou para a equipe";
    } else if (client.end) {
      state.done = true;
      state.endReason = "cliente encerrou";
    }
  }
  return state;
}

/** Custo da IA de verdade nesta conversa (linhas de consumo em memória) */
export function agentCostUsd(state: ScenarioState): number {
  return (state.sandbox.memory.ai_agent_usage || []).reduce((s, u) => s + (Number(u.cost_usd) || 0), 0);
}

/** Conversa completa para o avaliador (com as ferramentas, que são a fonte da verdade) */
export function transcriptForJudge(t: TranscriptEntry[]): string {
  return t.map((e) => {
    if (e.who === "cliente") return `[vez ${e.turn}] CLIENTE: ${e.text}`;
    if (e.who === "ferramenta") return `[vez ${e.turn}] (ferramenta consultada pela IA, o cliente não vê) ${e.text}`;
    if (e.kind === "legenda") return `[vez ${e.turn}] IA [legenda do material]: ${e.text}`;
    const media = e.kind && e.kind !== "text" ? `${MEDIA_LABEL[e.kind] || "[arquivo]"} ` : "";
    return `[vez ${e.turn}] IA: ${media}${e.text}`;
  }).join("\n");
}

export async function judgeScenario(apiKey: string, companyName: string, scenario: Scenario, state: ScenarioState, knowledge = ""): Promise<{ checks: RuleCheck[]; summary: string; costUsd: number }> {
  const system = `Você avalia conversas de WhatsApp entre um cliente e a atendente virtual (IA) de um buffet infantil (${companyName}). Hoje é ${todayText()}.

Regras do negócio que a IA deve seguir:
- Preços só da grade de preços (ferramenta consultar_valor_pacote), pela quantidade de convidados e dia; quando o cliente pede preço e já deu quantidade e data, ela passa o valor na mesma resposta.
- Nunca dá desconto, preço à vista diferente, brinde, entrada diferente ou condição especial.
- Datas: só oferece o que a agenda mostra livre (consultar_datas_livres / consultar_valor_pacote); diz que está disponível neste momento e que a data só fica garantida com contrato e sinal.
- Formatura, festa escolar, confraternização ou evento de empresa: não passa valor; pergunta tipo de evento, data e quantidade de pessoas e passa para a equipe.
- Quantidade abaixo do mínimo do menor pacote: explica logo o mínimo.
- Uma mensagem por vez; responde todas as perguntas juntas.
- Tom animado, 2–3 emojis por mensagem; usa o nome do cliente e do aniversariante quando sabe.
- Convida para visita sem exagero (no máximo a cada 3–4 respostas); se o cliente já tem visita marcada, só confirma — "ok/obrigado" depois de agendar não é novo pedido e nunca pode haver duas visitas.
- Não usa a palavra "sistema" com o cliente.
- Passa para a equipe quando o cliente pede atendente, quer negociar ou quando não sabe responder.
- Ao passar para a equipe, a frase "Nossa equipe atende ..." com o horário de atendimento é acrescentada automaticamente pelo sistema e está correta — não conte como invenção nem como erro.
- Pode dizer a diferença de preço entre dois pacotes (subtração exata dos valores da tabela).

INFORMAÇÕES DO BUFFET que a IA conhece e pode afirmar (fonte da verdade, junto com os resultados das ferramentas):
${knowledge || "(não informadas)"}

Cenário testado: ${scenario.title}
Perfil do cliente: ${scenario.persona}
O que se espera da IA neste cenário: ${scenario.expectation}

Avalie cada regra abaixo com "ok": true (cumpriu), false (falhou) ou null (não se aplica nesta conversa), e uma "nota" curta em português — quando falhar, cite o trecho da mensagem da IA.
${RULES.map((r) => `- ${r.id} (${r.label}): ${r.how}`).join("\n")}

Responda só com JSON: {"regras": [{"id": "preco_grade", "ok": true, "nota": "..."}], "resumo": "uma ou duas frases sobre a conversa"}`;
  const { json, costUsd } = await openAiJson(apiKey, system, transcriptForJudge(state.transcript) || "(conversa vazia)", "low");
  const byId = new Map<string, any>((Array.isArray(json.regras) ? json.regras : []).map((r: any) => [String(r.id), r]));
  const checks: RuleCheck[] = RULES.map((r) => {
    const got = byId.get(r.id);
    const ok = got?.ok === true ? true : got?.ok === false ? false : null;
    return { id: r.id, label: r.label, ok, note: String(got?.nota || "").slice(0, 400) };
  });
  return { checks, summary: String(json.resumo || "").slice(0, 600), costUsd };
}

export const passed = (checks: RuleCheck[]) => checks.every((c) => c.ok !== false);
