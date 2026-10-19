// O que a Celebrei oferece (base dos posts do Instagram @hubcelebrei). A IA de legenda só pode
// afirmar o que está em FATOS — tudo tirado da própria landing page (hubcelebrei.com.br) e do /comecar.

import { NO_WHATSAPP, SITE } from "./marca.ts";
export { ARROBA, SITE } from "./marca.ts";

/** Os dois assuntos dos posts (o público é sempre o dono de buffet infantil). */
export type Publico = "vendas" | "gestao";
export type TipoPost = "foto" | "pergunta" | "carrossel";

export type Ponto = { titulo: string; texto: string };

export type Tema = {
  id: string;
  publico: Publico;
  /** Nome curto do tema: vira o selo da arte. */
  nome: string;
  /** Sobre o que o post fala (para a IA de legenda). */
  angulo: string;
  /** Cena para a IA de imagem (em inglês, que ela segue melhor). Nunca com texto. */
  imagem: string;
  cenarios: string[];
  titulos: string[];
  perguntas: string[];
  /** Dois pontos de reserva para o carrossel quando a IA falhar. */
  pontos: [Ponto, Ponto];
};

export const FATOS = [
  `A Celebrei (${SITE}) é a plataforma de vendas e gestão para buffets infantis. Foi feita dentro de um buffet infantil de verdade.`,
  `Atendimento automático ${NO_WHATSAPP} do buffet, 24 horas por dia: responde na hora, faz as perguntas certas, envia fotos, vídeos e os pacotes do buffet e convida o cliente para visitar o espaço.`,
  "Quem pede orçamento de festa infantil chama vários buffets ao mesmo tempo. Fecha quem responde primeiro, e bem.",
  "Funil de vendas visual: cada lead entra sozinho no funil, com o histórico completo da conversa e o próximo passo à vista.",
  "Follow-up automático, alerta quando uma negociação esfria e uma IA que aponta quem vai fechar e a hora de chamar. Também tem campanhas e reativação de leads.",
  "Confirmação automática de visita.",
  "Agenda de visitas e festas: calendário por unidade, pré-reservas com prazo e checklist de cada festa.",
  "Contratos e financeiro: contrato gerado com os dados da festa, aceite digital pelo link e controle das parcelas.",
  "No dia da festa: painel da festa no celular, lista de presença digital, cardápio digital, escala de freelancers e avaliação pós-festa.",
  "Várias unidades num só painel, resumo diário com IA e tempo de resposta por vendedor.",
  `Site do buffet com o botão ${NO_WHATSAPP} e chatbot.`,
  `Criar a conta é grátis, em ${SITE}: a IA aprende sobre o buffet com perguntas simples, o dono marca as datas que já estão ocupadas, o site do buffet fica pronto e ele conecta o WhatsApp lendo um QR Code. A equipe Celebrei liga a IA.`,
  "Implantação guiada e suporte de quem vive o dia a dia de buffet. No site também dá para agendar uma demonstração gratuita.",
  "Sem planilha, sem caderno, sem lead esquecido: do primeiro contato até a festa, tudo num lugar só.",
];

/** Chamada de reserva (sem IA). Tem que bater com o site: conta grátis. */
export const CHAMADA = `Crie a conta do seu buffet grátis em ${SITE}.`;

const SEM_CRIANCAS = "no children in the frame";

export const TEMAS: Tema[] = [
  {
    id: "quem-responde-primeiro",
    publico: "vendas",
    nome: "Resposta na hora",
    angulo: `A mãe pede orçamento para vários buffets ao mesmo tempo e fecha com quem responde primeiro, e bem. Com a Celebrei, o buffet responde ${NO_WHATSAPP} na hora, com os pacotes, fotos e vídeos.`,
    imagem: `a beautifully decorated children's party hall in Brazil, colorful balloon arch, themed cake table with sweets, ${SEM_CRIANCAS}`,
    cenarios: ["bright afternoon light", "soft morning light through large windows", "warm festive lights"],
    titulos: ["Quem responde primeiro, fecha", "Orçamento respondido na hora", "Nenhum lead esperando"],
    perguntas: ["Quanto tempo seu buffet leva para responder?", "Você já perdeu festa por demorar?"],
    pontos: [
      { titulo: "Resposta em segundos", texto: `O atendimento automático responde ${NO_WHATSAPP} com os pacotes, fotos e vídeos do buffet.` },
      { titulo: "Convite para a visita", texto: "Depois das perguntas certas, o cliente já é convidado para conhecer o espaço." },
    ],
  },
  {
    id: "atendimento-24-horas",
    publico: "vendas",
    nome: "24 horas por dia",
    angulo: `O lead pede orçamento às dez da noite e só recebe resposta no dia seguinte, quando já fechou com outro buffet. Com a Celebrei, o atendimento ${NO_WHATSAPP} não dorme.`,
    imagem: `an empty children's party venue at night after closing, decorated tables, soft fairy lights still glowing, a phone resting face down on the reception counter, ${SEM_CRIANCAS}`,
    cenarios: ["blue hour, lights glowing", "late night, quiet hall", "early evening, staff gone home"],
    titulos: ["Atende até de madrugada", "Atendimento que não dorme", "Orçamento às dez da noite?"],
    perguntas: ["Quem responde seus leads à noite?", "Quantos orçamentos chegam no fim de semana?"],
    pontos: [
      { titulo: "Atende 24 horas", texto: `Responde na hora, de dia e de noite, ${NO_WHATSAPP} do seu buffet.` },
      { titulo: "Faz as perguntas certas", texto: "Data, quantidade de convidados e o que o cliente procura, antes de mandar os pacotes." },
    ],
  },
  {
    id: "visita-agendada",
    publico: "vendas",
    nome: "Visita agendada",
    angulo: "A visita ao espaço é onde a festa fecha. A Celebrei convida o cliente para a visita, deixa tudo na agenda e faz a confirmação automática da visita.",
    imagem: `the welcoming entrance and reception of a Brazilian children's party venue, a couple of parents seen from behind walking in with a staff member, playful decor, ${SEM_CRIANCAS}`,
    cenarios: ["sunny Saturday morning", "late afternoon golden light", "bright clean interior"],
    titulos: ["Do orçamento à visita", "Mais visitas na agenda", "Visita confirmada sozinha"],
    perguntas: ["Quantas visitas viram festa no seu buffet?", "Seu cliente esquece a visita?"],
    pontos: [
      { titulo: "Convite na conversa", texto: "O atendimento automático já convida para conhecer o espaço." },
      { titulo: "Confirmação automática", texto: "A visita fica na agenda e a confirmação vai sozinha para o cliente." },
    ],
  },
  {
    id: "follow-up",
    publico: "vendas",
    nome: "Follow-up",
    angulo: "Quem ficou de pensar some e ninguém lembra de retomar. A Celebrei faz o follow-up automático, avisa quando uma negociação esfria e a IA aponta quem vai fechar e a hora de chamar.",
    imagem: `a tidy buffet sales office with party decoration samples, a notebook, a coffee cup and a smartphone face down, balloons in the background, ${SEM_CRIANCAS}`,
    cenarios: ["morning light from a window", "a cozy office next to the party hall", "soft afternoon light"],
    titulos: ["Quem ficou de pensar volta", "Nenhuma festa esquecida", "O retorno que ninguém esquece"],
    perguntas: ["Quantos clientes ficaram de pensar?", "Quem faz o follow-up no seu buffet?"],
    pontos: [
      { titulo: "Follow-up automático", texto: "A conversa é retomada sem ninguém precisar lembrar." },
      { titulo: "Alerta de negociação fria", texto: "A IA aponta quem vai fechar e a hora certa de chamar." },
    ],
  },
  {
    id: "funil-de-vendas",
    publico: "vendas",
    nome: "Funil de vendas",
    angulo: "Conversas espalhadas no celular, em planilhas e no caderno. Na Celebrei, cada lead entra sozinho no funil, com o histórico completo da conversa e o próximo passo à vista.",
    imagem: `a buffet manager's desk with a closed laptop, a paper notebook pushed aside and colorful party decor around, a children's party hall visible through a glass door, ${SEM_CRIANCAS}`,
    cenarios: ["bright morning", "warm afternoon", "calm evening light"],
    titulos: ["Adeus, caderno de orçamentos", "Cada lead no lugar certo", "Sua equipe só foca em fechar"],
    perguntas: ["Onde ficam os orçamentos do seu buffet hoje?", "Planilha, caderno ou celular?"],
    pontos: [
      { titulo: "Lead entra sozinho", texto: "Cada conversa vira um card no funil, com todo o histórico." },
      { titulo: "Próximo passo à vista", texto: "Você sabe quem está em visita, quem negocia e quem fechou." },
    ],
  },
  {
    id: "comece-gratis",
    publico: "vendas",
    nome: "Conta grátis",
    angulo: `Convite para criar a conta do buffet grátis em ${SITE}: a IA aprende sobre o buffet com perguntas simples, o dono marca as datas ocupadas, o site do buffet fica pronto e ele conecta o WhatsApp lendo um QR Code.`,
    imagem: `a buffet owner's hands holding a coffee cup at a table in an empty, beautifully decorated children's party hall, seen from the side, ${SEM_CRIANCAS}`,
    cenarios: ["early morning before an event", "quiet weekday afternoon", "sunny morning"],
    titulos: ["Seu buffet atendendo sozinho", "Crie a conta do seu buffet", "Conta grátis para o seu buffet"],
    perguntas: ["O que seu cliente mais pergunta no orçamento?", "Qual pacote seu buffet mais vende?"],
    pontos: [
      { titulo: "A IA aprende o seu buffet", texto: "Você responde perguntas simples e marca as datas ocupadas." },
      { titulo: "Conecte pelo QR Code", texto: "O site do buffet fica pronto e a equipe Celebrei liga a IA." },
    ],
  },
  {
    id: "agenda-e-pre-reservas",
    publico: "gestao",
    nome: "Agenda e pré-reservas",
    angulo: "Data disputada e pré-reserva esquecida dão dor de cabeça. Na Celebrei, a agenda de visitas e festas tem calendário por unidade, pré-reservas com prazo e checklist de cada festa.",
    imagem: `a wall calendar and a planner on the desk of a children's party venue office, party supplies boxes and balloons nearby, ${SEM_CRIANCAS}`,
    cenarios: ["morning light", "a cozy back office", "bright afternoon"],
    titulos: ["Nenhuma data em dobro", "Pré-reserva com prazo", "A agenda do buffet em ordem"],
    perguntas: ["Seu buffet já marcou duas festas na mesma data?", "Como você controla as pré-reservas?"],
    pontos: [
      { titulo: "Calendário por unidade", texto: "Visitas e festas num lugar só, de cada unidade do buffet." },
      { titulo: "Pré-reserva com prazo", texto: "A data fica segura pelo prazo combinado e cada festa tem checklist." },
    ],
  },
  {
    id: "contrato-e-parcelas",
    publico: "gestao",
    nome: "Contrato e parcelas",
    angulo: "Contrato feito à mão e parcelas anotadas no caderno. Na Celebrei, o contrato sai com os dados da festa, o cliente aceita pelo link e as parcelas ficam controladas.",
    imagem: `a neat desk in a children's party venue with a pen, a closed folder and a cup of coffee, party decorations softly blurred in the background, ${SEM_CRIANCAS}`,
    cenarios: ["clean morning light", "warm afternoon", "a calm office"],
    titulos: ["Contrato assinado pelo link", "Parcelas sem caderno", "Fechou? O contrato já sai"],
    perguntas: ["Como seu buffet faz os contratos hoje?", "Quanto tempo leva para fechar um contrato?"],
    pontos: [
      { titulo: "Contrato com os dados", texto: "O contrato é gerado com os dados da festa, sem digitar de novo." },
      { titulo: "Aceite e parcelas", texto: "O cliente aceita pelo link e você acompanha cada parcela." },
    ],
  },
  {
    id: "dia-da-festa",
    publico: "gestao",
    nome: "Dia da festa",
    angulo: "No dia da festa, tudo no celular: painel da festa, lista de presença digital, cardápio digital, escala de freelancers e avaliação pós-festa.",
    imagem: `a children's party hall being set up, staff seen from behind arranging colorful centerpieces and balloons, festive and organized, ${SEM_CRIANCAS}`,
    cenarios: ["afternoon before the party", "warm festive lights", "bright daylight"],
    titulos: ["A festa toda no celular", "Lista de presença digital", "Equipe certa, festa tranquila"],
    perguntas: ["O que mais dá trabalho no dia da festa?", "Como você monta a escala da equipe?"],
    pontos: [
      { titulo: "Painel da festa", texto: "Lista de presença e cardápio digital, direto no celular." },
      { titulo: "Equipe e avaliação", texto: "Escala de freelancers e avaliação pós-festa para melhorar a próxima." },
    ],
  },
  {
    id: "feita-dentro-de-buffet",
    publico: "gestao",
    nome: "Feita por quem é de buffet",
    angulo: "A Celebrei foi feita dentro de um buffet infantil de verdade, por quem vive o dia a dia de buffet. Implantação guiada, suporte e, no site, uma demonstração gratuita.",
    imagem: `a cheerful children's party venue backstage area with stacked party supplies, a staff apron hanging and a balloon pump, warm and authentic, ${SEM_CRIANCAS}`,
    cenarios: ["late afternoon golden light", "bright morning", "festive evening light"],
    titulos: ["Feita dentro de um buffet", "Quem é de buffet entende", "Do jeito que o buffet funciona"],
    perguntas: ["Qual a maior dor do seu buffet hoje?", "O que um sistema de buffet precisa ter?"],
    pontos: [
      { titulo: "Feita no dia a dia", texto: "Criada dentro de um buffet infantil de verdade." },
      { titulo: "Implantação guiada", texto: "Suporte de quem vive o dia a dia de buffet." },
    ],
  },
];

/** Pedido da foto para a IA de imagem (a arte com logo e texto é montada depois, em imagem.ts). */
export function promptDaFoto(cena: string, cenario: string) {
  return [
    `Photorealistic editorial photo for a Brazilian brand that serves children's party venues (buffet infantil): ${cena}, ${cenario}.`,
    "Real children's party venue in Brazil. Bright, cheerful and warm: soft natural light, clean composition, festive accents in yellow, orange, pink and purple. Horizontal composition with the main subject centered, sharp focus.",
    "Absolutely NO text, letters, numbers, signs, banners with words, labels, price tags, logos or brand names anywhere; balloons, cakes and decorations have no writing;",
    "any phone, tablet or computer screen is turned away, dark or blurred and unreadable.",
    "No children in the frame. Adults only if natural in the scene (working, walking, seen from behind or from the side), never posing or looking at the camera, no close-up faces.",
  ].join(" ");
}

export function sorteia<T>(lista: readonly T[], semente: number): T {
  return lista[Math.abs(Math.trunc(semente)) % lista.length];
}

/** Escolhe o tema do público menos usado nos posts recentes (empate: pela semente). */
export function escolheTema(publico: Publico, usados: string[], semente: number): Tema {
  const candidatos = TEMAS.filter((t) => t.publico === publico);
  const contagem = (id: string) => usados.filter((u) => u === id).length;
  const menor = Math.min(...candidatos.map((t) => contagem(t.id)));
  const empatados = candidatos.filter((t) => contagem(t.id) === menor);
  return sorteia(empatados, semente);
}

export function escolheCenario(tema: Tema, usados: string[], semente: number) {
  const contagem = (c: string) => usados.filter((u) => u === c).length;
  const menor = Math.min(...tema.cenarios.map(contagem));
  return sorteia(tema.cenarios.filter((c) => contagem(c) === menor), semente);
}
