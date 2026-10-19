/**
 * O supabase-js transforma qualquer resposta non-2xx de uma Edge Function na
 * mesma mensagem generica: "Edge Function returned a non-2xx status code".
 * O motivo real — que a funcao devolve em `{ error: "..." }` — fica escondido
 * dentro de `error.context`, que e a Response crua e precisa ser lida.
 *
 * Sem isso, o usuario recebe uma frase que nao diz o que aconteceu nem o que
 * fazer, e o suporte fica sem rastro.
 */
export async function mensagemDaFuncao(
  erro: unknown,
  padrao = "Tente novamente em alguns instantes.",
): Promise<string> {
  const ctx = (erro as { context?: unknown })?.context;

  if (ctx instanceof Response) {
    try {
      // A Response so pode ser lida uma vez; clone para nao quebrar quem ler depois.
      const corpo = await ctx.clone().json();
      const msg = corpo?.error || corpo?.message;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    } catch {
      try {
        const texto = (await ctx.clone().text()).trim();
        if (texto && !texto.startsWith("<")) return texto.slice(0, 300);
      } catch { /* corpo ilegivel: cai no padrao */ }
    }

    // Sem corpo util: o status ainda diz mais do que a mensagem generica.
    if (ctx.status === 401 || ctx.status === 403) return "Sua sessão expirou. Entre novamente.";
    if (ctx.status === 429) return "Muitas tentativas seguidas. Espere um instante e tente de novo.";
    if (ctx.status === 504) return "A operação demorou demais e foi interrompida. Tente de novo.";
    if (ctx.status >= 500) return `O servidor falhou (erro ${ctx.status}). ${padrao}`;
  }

  const msg = (erro as Error)?.message;
  // A mensagem generica do supabase-js nao ajuda ninguem: prefira o padrao.
  if (msg && !msg.includes("non-2xx")) return msg;
  return padrao;
}
