import { ARROBA, CHAMADA, FATOS, SITE, type Ponto, type Tema, type TipoPost } from "./catalogo.ts";
import { CITA_WHATSAPP, NO_WHATSAPP, PROIBIDAS } from "./marca.ts";

export type Texto = { titulo: string; pergunta?: string; legenda: string; hashtags: string; pontos?: [Ponto, Ponto] };
export type TextoGerado = Texto & { origem: "ia" | "reserva"; erro?: string };

const HASHTAGS_VENDAS = ["celebrei", "buffetinfantil", "festainfantil", "donodebuffet", "buffetdefesta", "atendimentoautomatico", "vendas", "funildevendas", "inteligenciaartificial", "festas"];
const HASHTAGS_GESTAO = ["celebrei", "buffetinfantil", "festainfantil", "donodebuffet", "gestaodebuffet", "gestaodeeventos", "eventos", "organizacao", "festas", "empreendedorismo"];

function hashtagsPadrao(tema: Tema) {
  return (tema.publico === "vendas" ? HASHTAGS_VENDAS : HASHTAGS_GESTAO).map((h) => `#${h}`).join(" ");
}

/**
 * Procura no texto o que a marca não pode dizer. Devolve o motivo ou null.
 * Sem preço (regra do Victor, 19/10/2026). Algarismos só no "24 horas" que o site usa;
 * "grátis" só para a conta e a demonstração (são os únicos grátis que existem no site).
 */
export function problemaNoTexto(texto: string): string | null {
  for (const p of PROIBIDAS) if (p.regra.test(texto)) return p.motivo;
  if (/R\$|\bpor\s+m[eê]s|\bmensalidade|\bplanos?\b/i.test(texto)) return "citou preço ou plano";
  if (/%/.test(texto)) return "citou porcentagem";
  if (/garant/i.test(texto)) return "prometeu garantia";
  const semPermitidos = texto.replace(/\b24\s*(horas|h)\b/gi, "").replace(/\b24\/7\b/g, "");
  if (/\d/.test(semPermitidos)) return "citou número que não está nos fatos";
  const semGratisPermitido = texto.replace(
    /(conta|crie|criar|cadastr\S*|comece|come[çc]ar)\s+(\S+\s+){0,4}?(gr[áa]tis|gratuit[oa])|demonstra[çc][ãa]o\s+gratuita|(gr[áa]tis|gratuit[oa])\s+em\s+hubcelebrei/gi,
    "",
  );
  if (/gr[áa]tis|gratuit|de\s+gra[çc]a/i.test(semGratisPermitido)) return "disse que algo além da conta ou da demonstração é grátis";
  return null;
}

/** Legenda de reserva, sem IA: nunca sai post vazio. */
export function legendaReserva(tema: Tema, tipo: TipoPost, semente: number): Texto {
  const titulo = tema.titulos[Math.abs(semente) % tema.titulos.length];
  const pergunta = tipo === "pergunta" ? tema.perguntas[Math.abs(semente) % tema.perguntas.length] : undefined;
  const gancho = pergunta ? `${pergunta} Conta pra gente nos comentários! 👇` : `${titulo}.`;
  const corpo =
    tema.publico === "vendas"
      ? `Com a Celebrei, seu buffet responde ${NO_WHATSAPP} na hora, 24 horas por dia: envia fotos, vídeos e os pacotes e convida o cliente para a visita. 🎉`
      : "Na Celebrei, agenda, pré-reservas, contratos e o dia da festa ficam num lugar só. Sem planilha, sem caderno. 🎈";
  return {
    titulo,
    pergunta,
    legenda: [gancho, corpo, `${CHAMADA} ✅`].join("\n\n"),
    hashtags: hashtagsPadrao(tema),
    pontos: tema.pontos,
  };
}

function limpaHashtags(bruto: unknown, tema: Tema) {
  const lista = (Array.isArray(bruto) ? bruto : String(bruto || "").split(/[\s,]+/))
    .map((h) => String(h).replace(/^#/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}_]/gu, "").toLowerCase())
    .filter((h) => h.length >= 3 && !/\d/.test(h) && !PROIBIDAS.some((p) => p.regra.test(h)));
  const unicas = [...new Set(["celebrei", ...lista])].slice(0, 12);
  if (unicas.length < 8) return hashtagsPadrao(tema);
  return unicas.map((h) => `#${h}`).join(" ");
}

const corta = (s: unknown, max: number) => String(s || "").trim().replace(/\s+/g, " ").slice(0, max);

/** Legenda (e textos da arte) escritos pela IA, presos aos FATOS. Se falhar, usa a de reserva. */
export async function escreveTexto(tema: Tema, tipo: TipoPost, cena: string, semente: number): Promise<TextoGerado> {
  const reserva = legendaReserva(tema, tipo, semente);
  const chave = Deno.env.get("OPENAI_API_KEY");
  if (!chave) return { ...reserva, origem: "reserva", erro: "sem OPENAI_API_KEY" };

  const sistema = [
    `Você escreve posts de Instagram para a Celebrei (${ARROBA}), em português do Brasil.`,
    "Público: donos e gerentes de buffet infantil (festas de criança) no Brasil.",
    tema.publico === "vendas"
      ? "Assunto deste post: vender mais festas (atendimento rápido, visitas, follow-up, funil)."
      : "Assunto deste post: organizar o buffet (agenda, pré-reservas, contratos, parcelas, dia da festa).",
    "Tom: animado e próximo, de quem também é de buffet; frases curtas, sem clichê de vendedor e sem exagero.",
    "Você SÓ pode afirmar o que está nesta lista de fatos:",
    ...FATOS.map((f) => `- ${f}`),
    "Proibido: preço, valor ou nome de plano; porcentagens; algarismos (o único número permitido é \"24 horas\");",
    "inventar resultados, quantidades, prazos ou depoimentos de clientes; prometer garantia; citar nomes de buffets, clientes ou outras marcas;",
    "dizer que algo é grátis além de criar a conta e da demonstração.",
    CITA_WHATSAPP
      ? "Pode citar o WhatsApp como o canal onde o atendimento automático do buffet responde. Mas o convite final é SEMPRE para o site: nunca peça para chamar no WhatsApp, no direct ou por telefone."
      : "NÃO cite o WhatsApp: diga \"por mensagem\".",
    "Responda só em JSON.",
  ].join("\n");

  const pedido = {
    tema: tema.nome,
    sobre_o_que_falar: tema.angulo,
    tipo_de_post: tipo,
    o_que_aparece_na_foto: cena,
    site: SITE,
    formato_da_resposta: {
      titulo: "título curto para escrever SOBRE a foto: até 32 caracteres, sem emoji, sem ponto final",
      ...(tipo === "pergunta" ? { pergunta: "pergunta curta para o público responder nos comentários, até 48 caracteres, terminando com ?" } : {}),
      ...(tipo === "carrossel"
        ? {
            pontos:
              "lista com EXATAMENTE 2 itens {titulo, texto} para os cartões do carrossel: titulo até 26 caracteres, texto até 100 caracteres, cada um um passo ou benefício tirado dos fatos",
          }
        : {}),
      legenda: `3 parágrafos curtos: gancho (a dor do dono de buffet); como a Celebrei resolve (só fatos); chamada para criar a conta grátis em ${SITE}. Até 4 emojis no total. Até 650 caracteres. Sem hashtags.`,
      hashtags: "lista de 8 a 12 hashtags em português, sem o #, sem espaços e sem acento",
    },
  };

  try {
    const r = await fetch(`${Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-4o-mini",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: JSON.stringify(pedido) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const dados = (await r.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    if (!r.ok) throw new Error(dados.error?.message || `erro ${r.status}`);
    const j = JSON.parse(dados.choices?.[0]?.message?.content || "{}") as {
      titulo?: string;
      pergunta?: string;
      legenda?: string;
      hashtags?: string[] | string;
      pontos?: { titulo?: string; texto?: string }[];
    };
    return validaResposta(j, tema, tipo, reserva);
  } catch (e) {
    return { ...reserva, origem: "reserva", erro: (e as Error).message };
  }
}

/** Confere a resposta da IA. Qualquer problema → legenda de reserva (com o motivo). */
export function validaResposta(
  j: { titulo?: string; pergunta?: string; legenda?: string; hashtags?: string[] | string; pontos?: { titulo?: string; texto?: string }[] },
  tema: Tema,
  tipo: TipoPost,
  reserva: Texto,
): TextoGerado {
  const falha = (erro: string): TextoGerado => ({ ...reserva, origem: "reserva", erro });
  const titulo = corta(j.titulo, 40).replace(/[.!]+$/, "");
  const legenda = String(j.legenda || "").trim().slice(0, 1500);
  if (!titulo || legenda.length < 60) return falha("resposta incompleta");
  const pergunta = tipo === "pergunta" ? corta(j.pergunta, 60) || reserva.pergunta : undefined;
  let pontos: [Ponto, Ponto] | undefined;
  if (tipo === "carrossel") {
    const lista = (Array.isArray(j.pontos) ? j.pontos : [])
      .map((p) => ({ titulo: corta(p?.titulo, 30).replace(/[.!]+$/, ""), texto: corta(p?.texto, 120) }))
      .filter((p) => p.titulo && p.texto.length >= 15);
    if (lista.length < 2) return falha("carrossel sem os 2 cartões");
    pontos = [lista[0], lista[1]];
  }
  const tudo = [titulo, pergunta || "", legenda, ...(pontos || []).flatMap((p) => [p.titulo, p.texto])].join("\n");
  const problema = problemaNoTexto(tudo);
  if (problema) return falha(`a IA ${problema}`);
  return { titulo, pergunta, legenda, hashtags: limpaHashtags(j.hashtags, tema), pontos, origem: "ia" };
}
