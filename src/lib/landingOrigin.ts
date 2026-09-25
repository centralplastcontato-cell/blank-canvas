/**
 * Origem da visita na LP (ex.: ?origem=mesa, dos QR Codes das mesas do salão).
 *
 * A origem é lida da URL e guardada em sessionStorage porque o parâmetro some
 * quando a pessoa navega pela página antes de clicar em um botão.
 */

const STORAGE_KEY = "lp_origem";
const VALID_ORIGIN = /^[a-z0-9_-]{1,32}$/;

/** Texto que identifica cada origem nas mensagens de WhatsApp. */
const ORIGIN_LABELS: Record<string, string> = {
  mesa: "QR Code da mesa",
};

function normalize(value: string | null | undefined): string | null {
  const v = (value || "").trim().toLowerCase();
  return VALID_ORIGIN.test(v) ? v : null;
}

/**
 * Lê a origem da URL (se houver), persiste na sessão e devolve a origem ativa.
 * Sem sessionStorage (ex.: navegação privada restrita), usa só a URL.
 */
export function captureLandingOrigin(): string | null {
  if (typeof window === "undefined") return null;
  const fromUrl = normalize(new URLSearchParams(window.location.search).get("origem"));
  try {
    if (fromUrl) sessionStorage.setItem(STORAGE_KEY, fromUrl);
    return normalize(sessionStorage.getItem(STORAGE_KEY)) ?? fromUrl;
  } catch {
    return fromUrl;
  }
}

/** Rótulo da origem para a mensagem, ou null se a origem não tiver texto próprio. */
export function originLabel(origem: string | null | undefined): string | null {
  return origem ? ORIGIN_LABELS[origem] ?? null : null;
}

/** Frase de abertura da mensagem de boas-vindas do buffet, por origem. */
const ORIGIN_WELCOME_INTROS: Record<string, (empresa: string) => string> = {
  mesa: (empresa) => `Que bom que você conheceu o *${empresa}* numa festa aqui com a gente! ✨`,
};

/**
 * Abertura das boas-vindas para quem chegou por uma origem conhecida, ou null
 * para manter a frase padrão ("Recebemos seu pedido pelo site...").
 */
export function originWelcomeIntro(origem: string | null | undefined, empresa: string): string | null {
  const build = origem ? ORIGIN_WELCOME_INTROS[origem] : undefined;
  return build ? build(empresa) : null;
}

/**
 * Mensagem pré-preenchida dos atalhos diretos de WhatsApp (rodapé, localização)
 * para quem chegou por uma origem conhecida. O robô reconhece esse texto.
 */
export function directWhatsAppMessage(origem: string | null | undefined, companyName: string): string | null {
  const label = originLabel(origem);
  return label ? `Olá! 👋 Vim pelo ${label} do ${companyName} 🎉` : null;
}
