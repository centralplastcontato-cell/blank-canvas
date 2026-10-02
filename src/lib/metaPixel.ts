/**
 * Pixel da Meta (Facebook/Instagram Ads).
 *
 * Só é carregado nas páginas que chamam initMetaPixel (hoje, só a LP do
 * Castelo). trackMetaPixelEvent não faz nada se o Pixel não foi carregado —
 * por isso o chat de orçamento, que é compartilhado entre as LPs, pode chamar
 * o evento "Lead" sem afetar as páginas dos outros buffets.
 */

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const initialized = new Set<string>();

export function initMetaPixel(pixelId: string): void {
  if (typeof window === "undefined" || !pixelId || initialized.has(pixelId)) return;
  initialized.add(pixelId);

  if (!window.fbq) {
    // Snippet oficial da Meta, sem o <script> inline do index.html
    const fbq: Fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

export function trackMetaPixelEvent(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function" || initialized.size === 0) return;
  try {
    if (params) window.fbq("track", event, params);
    else window.fbq("track", event);
  } catch {
    // Pixel nunca pode quebrar o fluxo do orçamento
  }
}
