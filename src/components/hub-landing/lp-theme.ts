/** Paleta da LP, tirada do chapéu do logo: âmbar → laranja → rosa → roxo. */
export const GRADIENT_BG = "bg-gradient-to-r from-[#FF8A3D] via-[#F0457A] to-[#8E3FD9]";
export const GRADIENT_TEXT = `${GRADIENT_BG} bg-clip-text text-transparent`;

export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#0F1222] px-7 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(15,18,34,0.55)] transition-all duration-200 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:bg-[#1B2036] [@media(hover:hover)]:hover:shadow-[0_16px_36px_-12px_rgba(15,18,34,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0457A] focus-visible:ring-offset-2";
export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#0F1222]/10 bg-white/70 px-7 py-4 text-base font-semibold text-[#0F1222] backdrop-blur transition-all duration-200 [@media(hover:hover)]:hover:border-[#0F1222]/20 [@media(hover:hover)]:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0457A] focus-visible:ring-offset-2";

/** Rola suavemente até uma seção da página (âncoras do menu). */
export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
