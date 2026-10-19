// Identidade da Celebrei usada nas artes do Instagram (@hubcelebrei). Tudo que é da marca fica AQUI.
// Cores e logo são os mesmos da landing page (src/components/hub-landing/CelebreiLogo.tsx e lp-theme.ts).

export const SITE = "hubcelebrei.com.br";
export const ARROBA = "@hubcelebrei";

// Artes claras, como o site: fundo creme, texto quase preto e o degradê do chapéu de festa.
export const FUNDO = "#FFF9F3";
export const TINTA = "#0F1222";
export const CINZA = "#4B5163";
export const AMARELO = "#FFC93C";
export const LARANJA = "#FF8A3D";
export const ROSA = "#F0457A";
export const ROXO = "#8E3FD9";
export const AZUL = "#38BDF8";

/** Gradientes usados pelo logo (entram no <defs> de cada arte). */
export const LOGO_DEFS = `
  <linearGradient id="logo-cone" x1="0.35" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="${AMARELO}"/><stop offset="0.38" stop-color="${LARANJA}"/>
    <stop offset="0.72" stop-color="${ROSA}"/><stop offset="1" stop-color="${ROXO}"/>
  </linearGradient>
  <clipPath id="logo-recorte"><path d="M33.5 9.5 L51.5 50.5 Q32 57.5 13 51.5 Z"/></clipPath>`;

// Chapéu de festa da Celebrei (o mesmo vetor do site, caixa 64×64), desenhado na caixa de 512×512.
const CONE = "M33.5 9.5 L51.5 50.5 Q32 57.5 13 51.5 Z";
export const LOGO_512 = `<g transform="scale(8)">
  <path d="${CONE}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="7" stroke-linejoin="round"/>
  <path d="${CONE}" fill="url(#logo-cone)" stroke="url(#logo-cone)" stroke-width="3" stroke-linejoin="round"/>
  <g clip-path="url(#logo-recorte)">
    <path d="M10 30 Q32 22 56 16 L56 21 Q32 27 10 35 Z" fill="#FFFFFF" fill-opacity="0.38"/>
    <path d="M8 44 Q32 34 58 30 L58 35.5 Q32 39.5 8 49.5 Z" fill="#FFFFFF" fill-opacity="0.32"/>
    <circle cx="31" cy="20" r="1.5" fill="#FFFFFF" fill-opacity="0.7"/>
    <circle cx="24" cy="40" r="1.5" fill="#FFFFFF" fill-opacity="0.6"/>
    <circle cx="39" cy="44" r="1.7" fill="#FFFFFF" fill-opacity="0.6"/>
    <circle cx="42" cy="32" r="1.3" fill="#FFFFFF" fill-opacity="0.55"/>
  </g>
  <circle cx="33.5" cy="7.5" r="5" fill="#FFFFFF"/>
  <circle cx="33.5" cy="7.5" r="3.2" fill="#F2557F"/>
  <path d="M22 4.5 L24 10" stroke="${AMARELO}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M45.5 15 L50 11.5" stroke="${LARANJA}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M12.5 17.5 Q17 15.5 19.5 20 Q15.5 21.5 12.5 17.5 Z" fill="${ROSA}"/>
  <circle cx="15" cy="27" r="2.2" fill="${AZUL}"/>
  <circle cx="46.5" cy="5.5" r="2.2" fill="${AZUL}"/>
</g>`;

// ---------------------------------------------------------------- o que os textos podem citar

/**
 * O WhatsApp é o canal do produto (o atendimento automático do buffet), então pode ser citado
 * como recurso. Mas o convite é sempre para o site: nada de número de telefone nem "chama no WhatsApp"
 * (regra do Victor, 19/10/2026).
 */
export const CITA_WHATSAPP = true;
export const NO_WHATSAPP = CITA_WHATSAPP ? "no WhatsApp" : "por mensagem";
export const PELO_WHATSAPP = CITA_WHATSAPP ? "pelo WhatsApp" : "por mensagem";

/** Nunca aparecem em legenda, título, cartão, hashtag nem prompt de imagem. */
export const PROIBIDAS: { regra: RegExp; motivo: string }[] = [
  ...(CITA_WHATSAPP ? [] : [{ regra: /whats\s*app|\bzap\b|\bwpp\b/i, motivo: "citou o WhatsApp" }]),
  // O contato é só pelo site: nada de "chama/manda mensagem no WhatsApp" como convite.
  { regra: /(chama|chame|mande|manda|envie|fale|fala)\s+(\S+\s+){0,3}(no|pelo)\s+whats/i, motivo: "convidou para o WhatsApp em vez do site" },
  { regra: /\bdirect\b|\binbox\b|\bdm\b/i, motivo: "convidou para o direct em vez do site" },
];
