// Confraternização de empresas (Castelo, 22/10): o mesmo pacote, a mesma agenda
// e o mesmo PDF dos aniversários, mas a conversa é com um RH / dono de empresa —
// a IA não pergunta de aniversariante e fala de equipe e colaboradores. Ligado
// por empresa em ai_agent_settings (corporate_events_enabled, corporate_max_guests).

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Sinais fortes de evento de empresa (não "funcionário" solto: num aniversário o
// cliente pergunta dos funcionários/monitores do buffet)
const CORPORATE = /\b(confraterniza\w*|evento (da|de) empresa|festa (da|de) empresa|(minha|nossa|da|de) empresa|empresa (vai|quer|gostaria)|colaboradores|(nossos|meus|os) funcionarios|(da|nossa|minha) equipe|fim de ano (da|de|com a) (empresa|equipe|firma)|firma|rh\b|recursos humanos|endomarketing|corporativ\w*)/;

/** A mensagem fala de evento de empresa (confraternização, colaboradores, RH…)? */
export function mentionsCorporate(text: string | null | undefined): boolean {
  const t = norm(String(text || ""));
  if (t.length < 4) return false;
  return CORPORATE.test(t);
}

/** Bloco do prompt: como atender empresa (só nos buffets com a opção ligada) */
export function corporatePromptBlock(companyName: string, maxGuests: number | null): string {
  const cap = maxGuests && maxGuests > 0
    ? ` O espaço comporta até ${maxGuests} pessoas: se pedirem mais que isso, diga com gentileza que o ${companyName} recebe até ${maxGuests} pessoas e pergunte se dá para ajustar (não ofereça outro espaço). Acima da maior faixa de pacote há valor por pessoa adicional — consultar_valor_pacote já calcula; nunca invente esse valor.`
    : " Acima da maior faixa de pacote há valor por pessoa adicional — consultar_valor_pacote já calcula; nunca invente esse valor.";
  return `CONFRATERNIZAÇÃO DE EMPRESAS (o ${companyName} também atende): fim de ano, comemoração de equipe, evento da empresa. É o MESMO pacote, o MESMO PDF e a MESMA agenda dos aniversários; o formato é livre (só adultos, ou com a família e as crianças dos colaboradores), no almoço ou à noite.${cap}
- Assim que perceber que é empresa (em qualquer momento da conversa: "confraternização", "empresa", "colaboradores", "equipe", "fim de ano da empresa", "RH"), chame registrar_dados_festa com confraternizacao=true (e empresa=nome da empresa, se souber).
- Com empresa, NUNCA pergunte nome nem idade de aniversariante, nem tema infantil. Descubra, uma pergunta por vez e sem parecer formulário: o nome da empresa e de quem está falando; quantas pessoas, mais ou menos (e se vão crianças); a data ou o período (ex.: "primeira quinzena de dezembro") — registre o mês em registrar_dados_festa — e se prefere almoço ou noite.
- Com o mês e o número de pessoas, as fotos, o vídeo e o PDF saem como sempre: nas legendas fale da equipe e da confraternização (nada de criançada, aniversariante ou "carinha de quem faz aniversário"). Ex. de legenda_fotos: "Olha só o espaço que vai ser todinho da equipe de vocês nessa confraternização! 😍✨". Ex. de legenda_pdf: "E aqui estão os nossos pacotes pra 80 pessoas 📋✨".
- Argumentos: resolve tudo num lugar só (comida, bebida, equipe, espaço climatizado e estacionamento), e as crianças se divertem enquanto os adultos aproveitam. As datas de dezembro são as mais procuradas.
- Bebidas: o pacote inclui refrigerante e água. Bebida alcoólica NÃO está inclusa: se perguntarem, diga que não está inclusa no pacote e que a equipe confirma as possibilidades. Não prometa nada (nem que pode levar, nem valor).
- O resto segue igual: visita junto com o PDF, valores só de consultar_valor_pacote, nada de prometer degustação.`;
}

/** Nota quando o contato já é uma empresa */
export function corporateLeadNote(company: string | null | undefined): string {
  const name = String(company || "").trim();
  return `ESTE CONTATO É UMA EMPRESA (confraternização${name ? ` da ${name}` : ""}): siga o roteiro de CONFRATERNIZAÇÃO DE EMPRESAS — não pergunte de aniversariante, fale de equipe e colaboradores.`;
}

/** Legendas padrão dos materiais para empresa (quando a IA não escreveu as dela) */
export function corporateCaptions(c: { firstName: string; companyName: string; guests: number | null }) {
  return {
    photosIntro: `${c.firstName ? `${c.firstName}, olha` : "Olha"} só o espaço que vai ser todinho da equipe de vocês nessa confraternização! 😍✨`,
    videoCaption: `E agora olha o ${c.companyName} em dia de festa: comida boa, equipe cuidando de tudo e diversão pra todo mundo 🎬🎉`,
    pdfIntro: `E aqui estão os nossos pacotes${c.guests ? ` pra ${c.guests} pessoas` : ""} 📋✨`,
  };
}

/** Legenda da IA que fala de aniversário/criança não serve para empresa */
export function birthdayFlavored(text: string): boolean {
  return /aniversari|criancada|carinha de/.test(norm(text));
}
